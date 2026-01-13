$file = "client/pages/AdminDashboard.tsx"
$lines = Get-Content $file
# 0-indexed:
# Start Line 3005 -> Index 3004
# End Line 3328 -> Index 3327

# Keep 0..3003 (Lines 1..3004)
# Keep 3329..End (Line 3330..End)

$finalContent = $lines[0..3003] + $lines[3329..($lines.Count-1)]
$finalContent | Set-Content $file -Encoding UTF8
