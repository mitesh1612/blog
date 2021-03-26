---
toc: false
layout: post
description: A short post into how you can use ARM templates to deploy a storage container pre-populated with files.
categories: [Azure, ARM, ADLS]
title: How to deploy Azure Blob Container with files using ARM templates
comments: true
---

I know, I know, this is a really specific problem. But one that I encountered, and when I Googled/Bing'd it, I was not able to find any way to do it. I was able to fix it, and you might too, but I thought I should use my blog to share how I solved it, hoping it might come in handy who wants to achieve something similar. If you have alternate or downright better ways to do it, please feel free to add them in comments.

So I was writing some ARM (Azure Resource Manager) templates and I wanted to create a Azure Data Lake Storage Account (I'll use ADLS subsequently, since the full name is a handful otherwise) and a blob container as well. But I wanted this template to also populate the blob container with some existing files that lie at a public URL.

Usually, for this, first you need to create the Azure Storage Account and Container using an ARM template and then copy your files manually using any of the the various options available (Upload from portal, Storage Explorer, Azure CLI, Azure Powershell), but I wanted my ARM template to do this, since I wanted to automate of creating an already "initialized" container state without manual intervention. For that, I dipped my toes into a functionality ARM provides called [Deployment Scripts](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-script-template).

## What are Deployment Scripts?

Basically, Deployment Scripts provide you an option to run certain scripts for (mostly dataplane) operations as part of your ARM deployment. Those are useful if you want to perform some operation everytime with an ARM deployment. At the time of writing, ARM supports 2 variants of Deployment Scripts:

1. Az Powershell Deployment Scripts - If Powershell is your scripting language of choice and you're comfy with Azure Powershell commands
2. Az CLI Deployment Scripts - If you're more of a "bash" person and use Az CLI a lot

I don't have a preference of bash vs. Powershell, but I am well versed with Az CLI and hence I chose option 2.

The overview of this solution is simple. First create a storage account and a container using an ARM template, and then run a deployment script that downloads required files and uploads them to this created storage account. Simple, right? Since deployment scripts runtime is authenticated, I dont need to perform manual login, and it just works! ♥

I don't want this post to be a puff piece on deployment scripts, or a tutorial on how to use them. I believe Azure has some nicely written documentation for it, so if you need reference on deployment scripts, please use the documentation. Follow along for the actual template I used.

## Enough talk, show me the ARM template

So here's how my template works. First we will create a storage account, and a container for that storage account. This is textbook template for ADLS, nothing special here. (I've only shown the `resources` section for brevity)

```json
[
     {
            "type": "Microsoft.Storage/storageAccounts",
            "apiVersion": "2019-06-01",
            "name": "[parameters('storageAccountName')]",
            "location": "[resourceGroup().location]",
            "dependsOn": [],
            "sku": {
                "name": "Standard_RAGRS"
            },
            "kind": "StorageV2",
            "properties": {
                "accessTier": "Hot",
                "supportsHttpsTrafficOnly": true,
                "isHnsEnabled": true
            }
        },
        {
            "type": "Microsoft.Storage/storageAccounts/blobServices",
            "apiVersion": "2019-04-01",
            "name": "[concat(variables('storageAccountName'), '/default')]",
            "dependsOn": [
                "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName'))]"
            ],
            "properties": {
                "cors": {
                    "corsRules": []
                },
                "deleteRetentionPolicy": {
                    "enabled": false
                }
            }
        },
        {
            "type": "Microsoft.Storage/storageAccounts/blobServices/containers",
            "apiVersion": "2019-04-01",
            "name": "[concat(parameters('storageAccountName'), '/default/', parameters('containerName'))]",
            "dependsOn": [
                "[resourceId('Microsoft.Storage/storageAccounts/blobServices', parameters('storageAccountName'), 'default')]",
                "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName'))]"
            ],
            "properties": {
                "publicAccess": "None"
            }
        },
]
```

Now we will add a deployment script resource. Since the deployment script needs a logged in user's context, we also need to create a [User Assigned Managed Identity](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview). After that, we also need to give the managed identity appropriate access so that it can perform required operations. For simplicity, I am going to give **Contributor** access to the identity on the resource group this template is being deployed to. The following template achieves that

```json
[
    {
        "type": "Microsoft.ManagedIdentity/userAssignedIdentities",
        "apiVersion": "2018-11-30",
        "name": "[parameters('identityName')]",
        "location": "[resourceGroup().location]"
    },
    {
        "type": "Microsoft.Authorization/roleAssignments",
        "apiVersion": "2018-09-01-preview",
        "name": "[variables('bootstrapRoleAssignmentId')]", // This is just a random string
        "dependsOn": [
            "[resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', parameters('identityName'))]"
        ],
        "properties": {
            "roleDefinitionId": "[variables('contributorRoleDefinitionId')]",
            "principalId": "[reference(resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', parameters('identityName')), '2018-11-30').principalId]",
            "scope": "[resourceGroup().id]",
            "principalType": "ServicePrincipal"
        }
    },
]
```

(This is line by line example that Azure providers in their documentation with minor tweaks for clarity purposes btw.)

Now the actual solution to our problem (sorry for the long boilerplate).

We'll create a deployment script, and provide the identity above for it to use. Then we will download our data/files using a `wget` command. Then we can use any of the methods `az storage blob` CLI commands provide to upload it to the container. In my case, I had a directory with about 20 files to put into the container. So I zipped them and made a public URL of them to download. Then I unzip it in the deployment script and use the `upload-batch` command to upload the whole unzipped directory. The following template does that. Note I am using an inline script here, since the script was small, and I actually wanted to show the script contents (The important part here is the script, rest is just minor details).

```json
{
    "type": "Microsoft.Resources/deploymentScripts",
    "apiVersion": "2020-10-01",
    "name": "UploadFilesToADLS",
    "location": "[resourceGroup().location]",
    "kind": "AzureCLI",
    "identity": {
        "type": "UserAssigned",
        "userAssignedIdentities": {
            "[resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', parameters('identityName'))]": {}
        }
    },
    "dependsOn": [
        "[resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', parameters('identityName'))]",
        "[resourceId('Microsoft.Storage/storageAccounts/blobServices/containers', parameters('storageAccountName'), 'default', parameters('containerName'))]" // Should run this script only when container actually gets created
    ],
    "properties": {
        "forceUpdateTag": "[parameters('utcValue')]", //To force run script on redeployment
        "AzCliVersion": "2.2.0",
        "timeout": "PT30M",
        "arguments": "[concat(parameters('storageAccountName'), ' ', concat(parameters('containerName')))]",
        "scriptContent": "wget -O files.zip 'https://some-public-url/files.zip' ; unzip files.zip ; az storage blob upload-batch -d $2 -s datafolder --account-name $1",
        "cleanupPreference": "OnSuccess",
        "retentionInterval": "P1D"
    }
}
```

We are passing the name of the storage account and the name of the container as parameters to this deployment script. You can also parameterize the file URL if needed.

The fun part here is, you can also use `az storage` commands to download files from an ADLS account in the script and then upload them to the new ADLS (if you dont want to put your files at a public URL). In that case, you will need to give the managed identity access to that ADLS and tweak the script accordingly. And speaking of the managed identity, you can also limit the permissions to this identity if **Contributor** seems too broad of a permission.

That's it for this one. I hope my post helps you if you have to automate something similar. If you feel this can be achieved in a better or different way, feel free to "@" me at my socials or comment on my blog. See you in the next one.
