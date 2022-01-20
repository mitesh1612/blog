# New Post Script to bootstrap a new Markdown post

function SanitizeFileTitle {
    param ($UnsanitizedTitle)

    $SanitizedTitle = $UnsanitizedTitle.Replace(" ", "-").ToLower()
    return $SanitizedTitle
}

$FileTitle = Read-Host -Prompt "Enter the name of the file"

$Title = Read-Host -Prompt "Enter the title of the post"

# Create the file name

$DateToday = Get-Date -Format yyyy-MM-dd
$FileName = $DateToday  + "-" + $FileTitle +  ".md"

$FileContent = "---
toc: false
layout: post
description: 
categories: 
title: $Title
comments: true
---
"

New-Item -Path "_posts/" -Name $FileName -Type File -Value $FileContent

$FilePath = "_posts/" + $FileName

# Run VS Code
code $FilePath --add .