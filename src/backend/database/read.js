export async function driveRead(env, path) {
  const accessToken = env.DRIVE_TOKEN;
  if (!accessToken) {
    throw new Error("Missing Google Drive access token");
  }
  if (!path || typeof path !== "string") {
    throw new Error("Invalid path");
  }
  const headers = {
    Authorization: `Bearer ${accessToken}`
  };
  const escapeQuery = str =>
    str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  let parentId = "root";
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) {
    throw new Error("Invalid path");
  }
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
      throw new Error(
        `Google Drive error (${response.status}) while searching folder "${segments[i]}"`
      );
    }
    const data = await response.json();
    if (!data.files?.length) {
      throw new Error(`Folder not found: ${segments[i]}`);
    }
    parentId = data.files[0].id;
  }
  const fileName = escapeQuery(segments.at(-1));
  const fileQuery =
    `'${parentId}' in parents and ` +
    `name='${fileName}' and ` +
    `trashed=false`;
  const fileResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fileQuery)}&fields=files(id,name)`,
    { headers }
  );
  if (!fileResponse.ok) {
    throw new Error(
      `Google Drive error (${fileResponse.status}) while searching file`
    );
  }
  const fileData = await fileResponse.json();
  if (!fileData.files?.length) {
    throw new Error(`File not found: ${segments.at(-1)}`);
  }
  const fileId = fileData.files[0].id;
  const contentResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers }
  );
  if (!contentResponse.ok) {
    throw new Error(
      `Unable to read file (${contentResponse.status})`
    );
  }
  try {
    return await contentResponse.json();
  } catch {
    throw new Error(`File "${segments.at(-1)}" is not valid JSON`);
  }
}