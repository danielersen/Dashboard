import { getAccessToken } from "./drive_auth.js";

const escapeQuery = str =>
  str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

export async function driveWrite(env, path, body) {
  const accessToken = await getAccessToken(env);

  if (!path || typeof path !== "string") throw new Error("Invalid path");

  const headers = {
    Authorization: `Bearer ${accessToken}`
  };

  let parentId = "root";
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) throw new Error("Invalid path");

  for (let i = 0; i < segments.length - 1; i++) {
    const folderName = escapeQuery(segments[i]);
    const query =
      `'${parentId}' in parents and ` +
      `name='${folderName}' and ` +
      `mimeType='application/vnd.google-apps.folder' and ` +
      `trashed=false`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`,
      { headers }
    );
    if (!response.ok) {
      throw new Error(`Google Drive error (${response.status})`);
    }
    const data = await response.json();
    if (!data.files?.length) {
      const createFolder = await fetch(
        "https://www.googleapis.com/drive/v3/files",
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: segments[i],
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId]
          })
        }
      );
      if (!createFolder.ok) {
        throw new Error(`Unable to create folder ${segments[i]}`);
      }
      parentId = (await createFolder.json()).id;
    } else {
      parentId = data.files[0].id;
    }
  }

  const fileName = escapeQuery(segments.at(-1));
  const fileQuery =
    `'${parentId}' in parents and ` +
    `name='${fileName}' and ` +
    `trashed=false`;
  const fileResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fileQuery)}&fields=files(id)`,
    { headers }
  );
  if (!fileResponse.ok) {
    throw new Error(`Google Drive error (${fileResponse.status})`);
  }
  const fileData = await fileResponse.json();
  const content = JSON.stringify(body);

  if (fileData.files?.length) {
    const fileId = fileData.files[0].id;
    const updateResponse = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: content
      }
    );
    if (!updateResponse.ok) {
      throw new Error(`Unable to update file (${updateResponse.status})`);
    }
    return await updateResponse.json();
  }

  const metadata = {
    name: segments.at(-1),
    parents: [parentId]
  };
  const boundary = "drive-upload-boundary";
  const createResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body:
        `--${boundary}\r\n` +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\n` +
        "Content-Type: application/json\r\n\r\n" +
        content +
        `\r\n--${boundary}--`
    }
  );
  if (!createResponse.ok) {
    throw new Error(`Unable to create file (${createResponse.status})`);
  }
  return await createResponse.json();
}
