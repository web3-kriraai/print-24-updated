const fs = require('fs');

const filePath = 'd:/07-01-2026 new/print-24-updated/server/src/controllers/productController.js';
const content = fs.readFileSync(filePath, 'utf8');

// Replace the error-throwing logic with auto-numbering logic in createProduct
const oldPattern1 = `    const existingProduct = await Product.findOne(slugQuery);
    if (existingProduct) {
      const scope = subcategoryValue ? "subcategory" : "category";
      return res.status(400).json({ 
        error: \`A product with slug "\${productSlug}" already exists in this \${scope}. Please use a different slug.\` 
      });
    }`;

const newPattern1 = `    const existingProduct = await Product.findOne(slugQuery);
    if (existingProduct) {
      // Auto-append number to make slug unique
      const baseSlug = productSlug;
      let counter = 1;
      
      while (true) {
        const newSlug = \`\${baseSlug}-\${counter}\`;
        const newSlugQuery = subcategoryValue
          ? { slug: newSlug, subcategory: subcategoryValue }
          : { slug: newSlug, category: finalCategoryId, subcategory: null };
        
        const duplicate = await Product.findOne(newSlugQuery);
        if (!duplicate) {
          productSlug = newSlug;
          break;
        }
        counter++;
      }
    }`;

let newContent = content.replace(oldPattern1, newPattern1);

// Also update updateProduct function
const oldPattern2 = `      const duplicateProduct = await Product.findOne(slugQuery);
      if (duplicateProduct) {
        const scope = finalSubcategoryId ? "subcategory" : "category";
        return res.status(400).json({ 
          error: \`A product with slug "\${productSlug}" already exists in this \${scope}. Please use a different slug.\` 
        });
      }`;

const newPattern2 = `      const duplicateProduct = await Product.findOne(slugQuery);
      if (duplicateProduct) {
        // Auto-append number to make slug unique
        const baseSlug = productSlug;
        let counter = 1;
        
        while (true) {
          const newSlug = \`\${baseSlug}-\${counter}\`;
          const newSlugQuery = finalSubcategoryId
            ? { slug: newSlug, subcategory: finalSubcategoryId, _id: { $ne: productId } }
            : { slug: newSlug, category: finalCategoryId, subcategory: null, _id: { $ne: productId } };
          
          const duplicate = await Product.findOne(newSlugQuery);
          if (!duplicate) {
            productSlug = newSlug;
            break;
          }
          counter++;
        }
      }`;

newContent = newContent.replace(oldPattern2, newPattern2);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ Successfully updated productController.js with auto-numbering slug logic');
