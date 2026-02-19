import os

file_path = r'c:\Users\Suraj\Desktop\print-24-updated\server\src\controllers\orderController.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. createOrder Front image check
old1 = '''      } else if (!needDesigner) {
        return res.status(400).json({ error: "Front image is required." });
      }'''
new1 = '''      } else if (!needDesigner && !req.body.needDesigner) {
        return res.status(400).json({ error: "Front image is required for regular orders." });
      }'''

# 2. createOrder uploadedDesign check
old2 = '''    } else {
      return res.status(400).json({ error: "Uploaded design is required." });
    }'''
new2 = '''    } else {
      // If we don't have uploadedDesign, we only allow it if needDesigner is true 
      const isDesignerOrder = needDesigner === true || needDesigner === "true" || req.body.needDesigner === true || req.body.needDesigner === "true";
      if (!isDesignerOrder) {
        return res.status(400).json({ error: "Uploaded design is required for regular orders." });
      }
    }'''

# 3. createOrderWithAccount Front image check
# Note: Same as old1, but we need to replace all occurrences carefully if they differ
# Actually old1 is unique enough or we can use replace(..., 1) etc.

# Applying replacements
patched_content = content.replace(old1, new1)
patched_content = patched_content.replace(old2, new2)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(patched_content)

print("Successfully patched orderController.js")
