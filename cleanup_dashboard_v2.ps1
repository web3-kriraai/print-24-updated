$file = "client/pages/AdminDashboard.tsx"
$lines = Get-Content $file

$newLines = @()

# Line 1 (Index 0)
$newLines += $lines[0]
$newLines += 'import { getAuthHeaders } from "../utils/auth";'

# Line 2 to 705 (Index 1 to 704)
$newLines += $lines[1..704]

# Skip 706-752 (Index 705-751) - filteredAttributeRules
# Resume at 752 (Index line 753)

$newLines += $lines[752..1215]

# Skip 1217-1229 (Index 1216-1228) - getAuthHeaders definition
# Resume at 1229 (Index line 1230)

$newLines += $lines[1229..($lines.Count-1)]

$newLines | Set-Content $file -Encoding UTF8
