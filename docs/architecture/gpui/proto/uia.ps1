param([string]$App, [string]$Title)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$auto = [System.Windows.Automation.AutomationElement]
$scope = [System.Windows.Automation.TreeScope]
$run = Start-Process -FilePath $App -ArgumentList "window", "look", "--size", "900x700" -PassThru
Start-Sleep -Seconds 8
$named = New-Object System.Windows.Automation.PropertyCondition($auto::NameProperty, $Title)
$win = $auto::RootElement.FindFirst($scope::Children, $named)
if ($null -eq $win) {
    Write-Output "uia ${Title}: no window with that title"
} else {
    $all = $win.FindAll($scope::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    $blocks = @($all | Where-Object { $_.Current.AutomationId -like 'block:*' })
    Write-Output "uia ${Title}: nodes=$($all.Count) with_block_id=$($blocks.Count)"
    $all | Select-Object -First 40 | ForEach-Object {
        Write-Output ("  id=" + $_.Current.AutomationId + " | " + $_.Current.ControlType.ProgrammaticName + " | name=" + $_.Current.Name)
    }
}
Stop-Process -Id $run.Id -Force
