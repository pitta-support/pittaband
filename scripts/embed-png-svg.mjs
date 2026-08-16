import fs from "fs";
import path from "path";

const assetsDir =
  "C:/Users/jeanp/.cursor/projects/c-Users-jeanp-sci-fi-archive/assets";
const celePng = path.join(
  assetsDir,
  "c__Users_jeanp_AppData_Roaming_Cursor_User_workspaceStorage_f425decfb1fc029103dbc9ce7415d769_images_cele-d0e3bef5-c794-4254-b200-10f75e99f4fd.png"
);
const paradoxPng = path.join(
  assetsDir,
  "c__Users_jeanp_AppData_Roaming_Cursor_User_workspaceStorage_f425decfb1fc029103dbc9ce7415d769_images_paradox-68e4ef58-5fb7-4281-8f5a-d995f3628775.png"
);

function pngToSvg(pngPath, svgPath, viewBox) {
  const b64 = fs.readFileSync(pngPath).toString("base64");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <image href="data:image/png;base64,${b64}" width="100%" height="100%"/>
</svg>`;
  fs.writeFileSync(svgPath, svg);
}

pngToSvg(
  celePng,
  "C:/Users/jeanp/sci-fi-archive/images/effects/dandelion/cele.svg",
  "0 0 64 64"
);
pngToSvg(
  paradoxPng,
  "C:/Users/jeanp/sci-fi-archive/images/effects/paradox/paradox_logo.svg",
  "0 0 800 120"
);

console.log("embedded svg files written");
