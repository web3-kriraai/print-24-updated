$file = "client/pages/AdminDashboard.tsx"
$lines = Get-Content $file
# 0-indexed:
# Start Line 8513 -> Index 8512
# End Line 9233 -> Index 9232

$newContent = @(
    '              <ManageAttributeRules',
    '                attributeTypes={attributeTypes}',
    '                products={products}',
    '                categories={categories}',
    '                setLoading={setLoading}',
    '                setError={setError}',
    '                setSuccess={setSuccess}',
    '              />'
)

# Keep 0..8511 (Lines 1..8512)
# Insert newContent
# Keep 9233..End (Line 9234..End)

$finalContent = $lines[0..8511] + $newContent + $lines[9233..($lines.Count-1)]
$finalContent | Set-Content $file -Encoding UTF8
