const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\Suraj\\Desktop\\print-24-updated\\server\\src\\controllers\\orderController.js';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Front image check (multiple occurrences)
const old1 = '      } else if (!needDesigner) {\n        return res.status(400).json({ error: "Front image is required." });\n      }';
const new1 = '      } else if (!needDesigner && !req.body.needDesigner) {\n        return res.status(400).json({ error: "Front image is required for regular orders." });\n      }';

// 2. uploadedDesign check (multiple occurrences)
const old2 = '    } else {\n      return res.status(400).json({ error: "Uploaded design is required." });\n    }';
const new2 = '    } else {\n      // If we don\'t have uploadedDesign, we only allow it if needDesigner is true\n      const isDesignerOrder = needDesigner === true || needDesigner === "true" || (req.body && (req.body.needDesigner === true || req.body.needDesigner === "true"));\n      if (!isDesignerOrder) {\n        return res.status(400).json({ error: "Uploaded design is required for regular orders." });\n      }\n    }';

// Use split/join for global replacement to handle CRLF vs LF to some extent
// or better, normalize line endings first
content = content.replace(/\r\n/g, '\n');
content = content.split(old1).join(new1);
content = content.split(old2).join(new2);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully patched orderController.js");
