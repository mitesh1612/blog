---
toc: false
layout: post
description: A simple trick on how to use multiple Custom Script Extensions for Azure VMs, when you want to use multiple custom script extensions in one deployment at different stages of deployment, in a single ARM template.
categories: [Azure, ARM, VM]
title: How to have Multiple Custom Script Extensions for Azure Virtual Machines in One ARM Template Deployment
comments: true
---

Yes, I'm back with yet another Azure specific problem, but judging from the number of issues this problem is mentioned in, and the lack of solutions for it, I thought this solution is worth sharing more. I will not go over the concepts of Azure Virtual Machines or the Custom Script Extensions for Azure Virtual Machines. Microsoft gives a pretty great documentation for those, which you can read [here](https://docs.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-windows).

For the gist of it, Custom Script Extensions are used as post deployment configuration, or any other installation or configuration tasks after deploying a Virtual Machine, which can be added in an ARM template deployment for that Virtual Machine (VM). Let's look at the problem I was trying to solve.

## My Problem

So I was running 2 different scripts performing 2 different tasks in the deployment, but at different stages of the deployment. Consider the following diagram. (Sorry for the vague names, I dont believe the actual details matter here more than the problem)

![]({{ site.baseurl }}/images/2021-05-14-vms-with-multiple-extensions/ProblemDescription.png)

So I was performing a task using Script **A** at one stage of the deployment. Once Script A finishes execution, I need to deploy a resource **R**. R's deployment depends on the task done by Script A. Once R is deployed, I wanted to run another Script **B**. B depends on R's deployment. (Assume A is some pre-configuration for resource R, and B is some post-configuration needing resource R).

Its not that Azure doesnt support running multiple scripts, they do infact as specified in [this example](https://docs.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-windows#additional-examples). My issue was that I wanted to run Script B (the second script) at a later stage in the deployment.

So naively, say you tried adding these 2 scripts in your ARM template, like this:

```json
[
    {
        "type": "Microsoft.Compute/virtualMachines/extensions",
        "apiVersion": "2020-12-01",
        "name": "[concat(variables('vmName'),'/', 'ScriptA')]",
        "location": "[parameters('location')]",
        "dependsOn": [
            "[concat('Microsoft.Compute/virtualMachines/',variables('vmName'))]"
        ],
        "properties": {
            "publisher": "Microsoft.Compute",
            "type": "CustomScriptExtension",
            "typeHandlerVersion": "1.7",
            "autoUpgradeMinorVersion": true,
            "settings": {
                "fileUris": [
                    "https://SomePublicUrl/HavingThe/ScriptA.ps1"
                ],
                "commandToExecute": "powershell.exe -ExecutionPolicy Unrestricted -File ScriptA.ps1"
            }
        }
    }, // Omitting R's deployment
    {
        "type": "Microsoft.Compute/virtualMachines/extensions",
        "apiVersion": "2020-12-01",
        "name": "[concat(variables('vmName'),'/', 'ScriptB')]",
        "location": "[parameters('location')]",
        "dependsOn": [
            "[concat('Microsoft.SomeResource/',variables('resourceR'))]"
        ],
        "properties": {
            "publisher": "Microsoft.Compute",
            "type": "CustomScriptExtension",
            "typeHandlerVersion": "1.7",
            "autoUpgradeMinorVersion": true,
            "settings": {
                "fileUris": [
                    "https://SomePublicUrl/HavingThe/ScriptB.ps1"
                ],
                "commandToExecute": "powershell.exe -ExecutionPolicy Unrestricted -File ScriptB.ps1"
            }
        }
    }
]
```

and I am sure you must have, then your template will not fail validation and start deployment. But when it reaches the second script, you are greeted with this error:

> "Multiple VMExtensions per handler not supported for OS type 'Windows'. Extension 'ScriptA' with handler 'Microsoft.Compute.CustomScriptExtension' already added."

Ah, as Microsoft says, you cant use multiple custom script extension in one ARM deployment, or can you?

## The Solution

So Microsoft technically says you can't have multiple VM Extensions in one deployment. But there is a hack here. If you remove the first custom script extension during deployment, before the second script extension is deployed, you can add another custom script extension! 😀 This is it, this is how this problem is solved. If this was enough for you, thanks for reading till here. Follow along on how to actually do it.

So in our problems context, we need to remove the custom script extension for script A, before script B is deployed. There are multiple ways to go about it:

1. ScriptA contains the code to remove itself.
2. Remove ScriptA using some other way during the deployment.

Obviously 1 is a simpler way, you can add a `az` cli or `AzPowerShell` command at the end of your script to reomve their custom script extension. I dont prefer that way, because then your script needs all these details (name of your resource group, name of the VM, name of the Custom Script extension etc.) and these dont feel like generic scripts (which are better and easier to test/develop). So lets focus on way 2.

Since ARM deployments dont allow you to make any other calls except *Create Resource* calls, how do you delete a resource in an ARM template deployment? We can use [`Deployment Scripts`](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-script-template) and an az CLI command to delete the extension for script A. We can also use a clever depends on relationship to make sure everything happens when we want it to, as shown in the diagram below. Moreover, you can also share a managed identity between the Virtual Machine and Deployment Script, if your custom script extension also needs an identity.

![]({{ site.baseurl }}/images/2021-05-14-vms-with-multiple-extensions/SolutionOverview.png)

Now all that remains is to write this down in an ARM template. That template might look like as follows.

## Enough talk, show me the ARM template

So here's how my template works. First we will create the extension for script A. Then we deploy R and the deployment script to remove A, which is written as an azure cli script, both dependent on A. And then we add the extension for script B. (I've only shown the `resources` section for brevity).

```json
[
    {
        "type": "Microsoft.Compute/virtualMachines/extensions",
        "apiVersion": "2020-12-01",
        "name": "[concat(variables('vmName'),'/', 'ScriptA')]",
        "location": "[parameters('location')]",
        "dependsOn": [
            "[concat('Microsoft.Compute/virtualMachines/',variables('vmName'))]"
        ],
        "properties": {
            "publisher": "Microsoft.Compute",
            "type": "CustomScriptExtension",
            "typeHandlerVersion": "1.7",
            "autoUpgradeMinorVersion": true,
            "settings": {
                "fileUris": [
                    "https://SomePublicUrl/HavingThe/ScriptA.ps1"
                ],
                "commandToExecute": "powershell.exe -ExecutionPolicy Unrestricted -File ScriptA.ps1"
            }
        }
    }, 
    // Omitting R's deployment
    {
        "type": "Microsoft.Resources/deploymentScripts",
        "apiVersion": "2020-10-01",
        "name": "RemoveScriptA",
        "location": "[resourceGroup().location]",
        "kind": "AzureCLI",
        "identity": {
            "type": "UserAssigned",
            "userAssignedIdentities": {
                "[resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', parameters('identityName'))]": {}
            }
        },
        "dependsOn": [
            "[resourceId('Microsoft.Compute/virtualMachines/extensions', variables('vmName'),'ScriptA']"
        ],
        "properties": {
            "forceUpdateTag": "[parameters('utcValue')]", // To force run script on redeployment
            "AzCliVersion": "2.2.0",
            "timeout": "PT30M",
            "arguments": "[concat(variables('vmName'), ' ', resourceGroup().name)]",
            "scriptContent": "az vm extension delete -g $2 --vm-name $1 -n ScriptA", // Az CLI Command to remove an extension
            "cleanupPreference": "OnSuccess",
            "retentionInterval": "P1D"
        }
    }
    {
        "type": "Microsoft.Compute/virtualMachines/extensions",
        "apiVersion": "2020-12-01",
        "name": "[concat(variables('vmName'),'/', 'ScriptB')]",
        "location": "[parameters('location')]",
        "dependsOn": [
            "[concat('Microsoft.SomeResource/',variables('resourceR'))]",
            "[resourceId('Microsoft.Resources/deploymentScripts', 'RemoveScriptA']"
        ],
        "properties": {
            "publisher": "Microsoft.Compute",
            "type": "CustomScriptExtension",
            "typeHandlerVersion": "1.7",
            "autoUpgradeMinorVersion": true,
            "settings": {
                "fileUris": [
                    "https://SomePublicUrl/HavingThe/ScriptB.ps1"
                ],
                "commandToExecute": "powershell.exe -ExecutionPolicy Unrestricted -File ScriptB.ps1"
            }
        }
    }
]
```

This is almost the same template that I used and it works perfectly.

That's it for this one. I hope my post helps you if you were also trying to achieve something similar. If you feel this can be achieved in a better or different way, feel free to "@" me at my socials or comment on my blog. See you in the next one.
