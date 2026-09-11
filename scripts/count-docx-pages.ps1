param([string]$Path)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
  $doc = $word.Documents.Open($Path)
  $pages = $doc.ComputeStatistics(2)
  Write-Output $pages
  $doc.Close($false)
} finally {
  $word.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
