
$remote="/widget"
$local=".\Kaigi"

echo @"
open 192.168.187.20
gregseven
greg7
dir
prompt
bin
"@ > ftpcmd



$location=get-location
$cmd='lcd "'+$location+'\'+$local+'"';
echo $cmd >> ftpcmd
$cmd='mkdir "'+$remote+'/'+$local.replace("\","/")+'"';
echo $cmd >> ftpcmd
$cmd='cd "'+$remote+'/'+$local.replace("\","/")+'"';
echo $cmd >> ftpcmd
$cmd='mput *';
echo $cmd >> ftpcmd

$directorys=Get-ChildItem $local -Directory -Recurse
foreach($directory in $directorys)
{
    $relative = $directory.fullname.substring($location.path.length)
    $location.path
    $relative = $relative.replace("\","/")
    $relative
    $files=Get-ChildItem $directory.fullname -File -Recurse
    $cmd='lcd "'+$directory.fullname+'"';
    echo $cmd >> ftpcmd
    $cmd='mkdir "'+$remote+$relative+'"';
    echo $cmd >> ftpcmd
    $cmd='cd "'+$remote+$relative+'"';
    echo $cmd >> ftpcmd
    $cmd='mput *';
    echo $cmd >> ftpcmd
}
echo "bye" >> ftpcmd


ftp -s:ftpcmd
#rm ftpcmd