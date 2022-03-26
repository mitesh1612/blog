---
toc: false
layout: post
description: A bird's eye view of Cloud Computing, different kinds of services available and some essential concepts along the way.
categories: [Cloud, Azure, IaaS, PaaS]
title: A Journey into the Cloud
image: images/2022-03-26-journey-to-the-cloud/herosplash.png
comments: true
---

This is a different style of deep dive. Today we will be taking a deep journey into the cloud, from where we started to where we are now and where we might go. For experience devs, this might not be super interestng and they will be familiar with a lot of concepts we will be talking about. But I love the journey and the innovations that were made along the way to reach where we are right now, and hence this post.

Also a sidenote, since I am only experienced with Azure mostly at the moment, I will try to avoid talking about specific cloud offerings here from any provider (to not make it a info doc about various services offered by different providers) and instead focus on the general concepts but there might be references to common offerings or their equivalents with major cloud providers. With all that, let's begin

## Introduction

Chances are, if you are working as a software developer, you are deploying your code to the cloud and make it run on servers instantly. How did we get here?

The common stages of creating an application is writing code, packaging said code and then deploying that package to some server/machine where it runs (and makes money 💵 for you).

Say I built a billion dollar app idea and I want to make this available to tons of users, what are my options?

## Roll my own servers? Onprem

Assuming the Azure, AWS and GCPs of the world didnt exist, we would have to roll out our own servers and deploy and run our code on them. Seems easy enough, right? Well in reality, its not that simple. Rolling out your infrastructure requires a lot of management, building servers, managing their power (with backup), cooling them down, managing their network and other various such problems.

I come from India, where the temparatures are usually very high and the cost of cooling my servers alone will be a lot. And this is a recurring theme. While its not hard to roll out your own servers, usually the cost will always be far higher than the cost of the cloud, especially if you are in early stages.

![]({{ site.baseurl }}/images/2022-03-26-journey-to-the-cloud/onpremises.png)

Then there is the process of managing these servers as well. You need to maintain replicas for everything such that in an unlikely event, if something happens to your hardware, consumer data is not lost. We also want to address the problem of being closer to where our users are to have lower latencies. That means an upfront cost of getting a place to host our infrastructure and then managing that said infrastructure. I can go on and on, but I think you get the idea.

If after all this, you are still interested on how to roll your own servers, I would suggest going through this (although satirical), truly informative [Fireship Video](https://www.youtube.com/watch?v=QdHvS0D1zAI).

## Get the Infrastructure : IaaS

IaaS or infrastructure is really a simple idea. A cloud provider provides you basic infrastructure (that's managed by them) and you can decide how to run your application as well how to setup the infra, monitor and maintain it.

### Simple IaaS : Virtual Machines

What's the simplest infrastructure component we can get? A server or a virtual machine. AWS has EC2 (Elastic Compute Cloud), Azure has Virtual Machines and GCP has Compute Engine. In essence they are either real machines or servers rented to you as whole or split into smaller machines, using *virtualization* (and that's why they are called virtual machines). The splitting is invisible to you as an end customer and for all intents and purposes, you get a single isolated functioning machine.

Since you want your server to be available on the internet, you need to have a public IP address. This is the IP address that you can access your server from the internet. I will not go into much detail on dynamic IPs vs reserved IPs, since I am not procifient enough in networking (but hey some day).

After getting the IP address, you can remote into your machine (using SSH or RDP), install our code package and run it. (*Note*: Running it might require us registering the application with process manager so that it keeps running even after we logout or gets started automatically if we restart the machine).

#### Small interlude : Deploying an ASP.NET App

To give a rough idea of how a IaaS deployment will look, lets say we have a ASP.NET app that you want to deploy on a Virtual Machine. After getting a barebones VM with Windows installed, the first step we can do is to install the ASP.NET Core runtime. After that we can copy our packaged application and run it.

After getting the IP address, we can also register this IP address to a well known name (and ease our users of not remembering an IP address).

To monitor the application, we can log in to the VM and see the logs emitted by our application if something goes wrong. (Do note that there are services that ingest these logs and provide us with a dashboard to see the logs in a more meaningful way and they also provide metrics like CPU usage etc.).

Again, this doesnt cover everything like OS Firewall, but this is mostly what it will take to deploy your application to the cloud in its most simplest format.

### Increasing the Complexity of IaaS

Ofcourse, no application worth its money can be satisfied with a single server. As the number of users increases, your single paltry server will struggle to serve all your users. CPU and Memory usage will be maxed out. What do we do then? We can opt for more capable machines and keep on adding CPU cores and memory. This is referred to as **vertical scaling**. But this can be only done to a certain limit.

So another option becomes to do **horizontal scaling** where instead of using a single server, we deploy copies of the same server (and these servers need not be super capable, they can be commodity hardware as well).

![]({{ site.baseurl }}/images/2022-03-26-journey-to-the-cloud/scaling.png)

Now for horizontal scaling, we can easily deploy multiple servers and set them up. But now we need a new system, that can *balance the load* and *support fail over* (ignore servers which dont work).

That's were Load Balancers come in. Now Load Balancers is a complex topic (sound off if you want to learn more and I will try to cover it in a later post), so I will try to give you a brief overview of what kind of Load Balancers are available and how to choose.

Using Load Balancers should be transparent and they should be fast. Additionally they should support the protocols that we use in our application. (Another important requirement is that they should be able to handle TLS/SSL termination). There are good open source load balancers like Nginx and HAProxy which are software based Load Balancers. (There are hardware based load balancers as well but we are more interested on how this is handled on the cloud).

Load Balancers also come in 2 categories: **Network** (or) **L4 Load Balancers** and **Application** (or) **L7 Load Balancers**.

Now after choosing Load Balancers, we also need to determine how to do **Automatic Scaling**. Predicting the server load is hard and we cant have a fixed number of servers for ourselves. For example there might be usage spikes during certain times of day where we might need more servers to handle more requests whereas other times, during low usage hours, we can do away with lesser servers (and save money as well!).

In case of IaaS, since we are provisioning servers manually, we can setup automation using scripts or full blown applications that can hook into the metrics and monitoring information of our existing servers and consequently scale them up or down by provisioning or deprovisioning new servers.

This all form IaaS as signified in the image below.

![]({{ site.baseurl }}/images/2022-03-26-journey-to-the-cloud/iaas.png)


## Let's do one better : PaaS 

If all of the above seems like a chore to get your application out, well it is. When going with IaaS, developers need to think about security, scale and management for their infrastructure and work accordingly. These are common problems and these can be abstracted out to make lives easier.

So **PaaS** or *Platform-as-a-Service* goes one step further.

Let's say you want to deploy a ASP.NET app. The infrastructure or the servers required to run that app follow some really specific configuration (having some proper version of the runtime installed etc). A PaaS handles all of that for you.

What we have is essentially a platform for creating software, as a service.

In a PaaS, a developer can upload their code and the underlying Platform takes care of provisioning required infrastructure and providing scaling and security capabilities as well. But hey lets not rush here

One of the pioneers for this type of solution was Heroku, which was initially built to host Rails applications. Heroku took the Rails ideas of convention over configuration and applied them to server deployment, promising that if you had a conventional Rails application they would use that knowledge to handle packaging and deployment tasks for you. You can provide Heroku access to your code and it will take care of packaging the code, run on fully managed virtual servers. There was also a common layer that handles load balancing.

Heroku also supported choosing number of servers to host the app on and all the logs that your application emitted would be captured and provided to you.

This opinionated and simplified hosting become the foundation of PaaS.

![]({{ site.baseurl }}/images/2022-03-26-journey-to-the-cloud/anatomyofpaas.png)

### Talking about Docker and Kubernetes

Heroku relied on specific packaging style for your code and other similar attempts were made to do the same. Like fixing the name of your application binary (e.g. AppServer.exe), fixing the start command for your application (e.g. `npm run start`) and fixing ports where your application can run (like 8080 etc). There were attempts to standardize all of this, but it never went off. But luckily, a standardized format for packaging your application and its dependencies was already there: *Docker Containers*.

Docker containers gave you  a way to fully standardize the OS, patches, dependencies, application code and configuration setup—all in a way that a container could be created right on the local development machine. A container created this way would run exactly the same on any server.

Now for deploying these packages or containers, cloud companies can get creative on how they can take that package and run it for you. This gave the idea of *orchestration*, which allows you to use your severs as one giant pool, or cluster, of computing capacity—and run as few or as many containers as you need for each of your applications, in that cluster.

An orchestrator can handle your deployments, keep track of which servers have which containers running on them, which servers have capacity available to run more, where the best place is to run the next container, and the list of containers and their IP address / port combinations that are running as part of each application. These orchestrators can then provide their own load balancing systems, or integrate with the existing load balancers on offer. This entire containerization & orchestration ecosystem allows you to abstract away the concept of a server—it doesn't matter what OS or version or software is installed on each server, because any server that has the orchestrator's agent installed is now a source or raw computing power that and be added into your resource pool. Your applications will bundle the OS and dependencies of their choice along with code, so they don't care at all about where or what they're running on.

Kubernetes is the most popular orchestrator and all famous cloud providers provide their own managed kubernetes services like AKS (Azure Kubernetes Service) in Azure, EKS (Elastic Kubernetes Service) in AWS or GKE (Google Kubernetes Engine) in GCP.

Alongwith these, there are services like Azure Container Instances or Elastic Container Service to run one off containers and services that provide registries to store and pull these containers from (like Azure Container Registry etc.)

### But we are back to servers again?

Once we have cloud-managed orchestrators running our deployments on our server clusters, the obvious question arises—why do we need to manage these underlying servers in the first place? If these orchestrators are running on the cloud and the cloud companies are managing all these servers anyway, why not just integrate server management? This gave rise to a new set of services. These services allow you to set up your applications, specify how much CPU and RAM each container needs, and just let the cloud provider figure it out. They'll treat their entire fleet of servers as one gigantic pool or cluster and give you exactly the capacity you need. They also apply their security experience to make sure your applications are completely isolated, even if they're all technically running in the same cluster. Good examples here are Amazon Fargate or Google Cloud Run.

![]({{ site.baseurl }}/images/2022-03-26-journey-to-the-cloud/paas.png)


## Jumping to the next level : FaaS

Now thinking about the servers was the main problem, so we came up with a term called **Serverless**. This is a misnomer. Serverless definitely doesn't mean no servers, serverless is more like servers that you don't think about.

How did we get here? Cloud providers gave a method to take your code and just run it. Again this code needs to follow a particular API, particular tech stack and is packaged in a particular way and operates in a certain limit. But if the stars align, the cloud can do something magical. It can invoke your code exactly when its necessary, charge you for exactly how many times its invoked (or how much time it runs for) and do it instantly at any scale, and you never have to even think about a server.

This is essentially like running a function on the cloud and not worry about anything else. 

A **FaaS**, or *functions-as-a-service* system, works very differently. Your application is not a stand-alone system here—it's a smaller piece of code that fits tightly into a much larger framework offered by the FaaS system. It cannot run independently—it needs to follow the technology, dependency, packaging, deployment and execution rules of the FaaS, and it can run only in the context of that FaaS.

In FaaS, the code can run as seldom as you want or as frequently you want.

There is a big drawback here though. Sometimes there might be cases that since the function is not invoked that frequently, the cloud provider needs to "warm up" a server that is going to run this function. (Here warming up can include number of things like actually provisioning a server, or deploying your code package to a pre-provisioned server). Due to this, the first or the initial execution of a function might take longer. This is referred to **cold start** and is a common occurrence in a FaaS system. (Although companies are trying to mitigate this in various ways.)

The other problem is limited stack and dependencies available. For example, earlier Functions only supported some common languages like JavaScript, Python, C#. Alongwith that, if your application relies on some dependency that is not usually part of the runtime, well good luck. Ofcourse, these problems are also tackled and there are solutions already for this as well.

The famous big names here are Azure Functions, AWS Lambdas or Cloud Functions from GCP.

### Optional Interlude, how does FaaS work?

If you are wondering how the FaaS systems work, here is an excerpt, straight from [this excellent blog post](https://sudhir.io/the-big-little-guide-to-running-code-in-the-clouds)

> The cloud companies do this by first creating a smart event router—when an event comes to the router and needs your code to process it, the router will see if your code is already running in a slot. I'm making up the word slot here—I have no idea what they're called internally. But these companies join the router with custom orchestrators that create a huge pool of secure, isolated execution slots on thousands or millions of their machines—when an event comes to the router and needs to be processed, the router looks to see if any of these slots is running your code. If none are, your code is loaded up from common network storage and initialized in a slot. The event is then passed as an input to your code, and after it finishes executing the output is routed to wherever it needs to go. Your code may be kept running in the slot for a while, in the hope that it might be used again soon, or the slot might be cleared and used with some other code.

For the sake of completion, lets also talk about two, more concepts

## BaaS : Backend as a Service

One step further from PaaS, this usually occurs where our application has a separate backend and frontend. In such cases, cloud can provide SDKs that bring the backend to the frontend and a developer can directly connect to a cloud backend without writing their own backend code.

These SDKs can do multiple things like store things into the database, perform authentication, run some code based on some event etc.

One of the most famous players in this space is Firebase alongwith services like AWS Amplify.

## SaaS : Software as a Service

This is the limit. In this case, as a user you directly get a software, as a service thats built on top of these cloud technologies and provides limited capabilities of what you can do. Usually SaaS tools are web based tools like Google Docs or Dropbox etc (they can have native apps as well, but they do talk to cloud infrastructure powering them).

These run completely on the cloud and are completely managed by the vendor that is providing the software.

![]({{ site.baseurl }}/images/2022-03-26-journey-to-the-cloud/anatomyofpaas.png)

## In closing 

![]({{ site.baseurl }}/images/2022-03-26-journey-to-the-cloud/herosplash.png)

The most important things I learned about cloud and deciding what to kind of services to go for relies on two concepts:

1. How much stuff do you want to be managed by you vs. the provider. Use the above diagram for reference
2. What kind of cost are you willing to pay.

Interestingly, the more managed a service gets, the less freedom you get on how to write and run your code as well.

Also, since I love Pizza 🍕 and I also love Analogies, here is a comparision of onprem, IaaS, PaaS, FaaS and SaaS in terms of Pizza (source linked in references):

![]({{ site.baseurl }}/images/2022-03-26-journey-to-the-cloud/pizzaas.png)

This has been a bird's eye view on all the different kinds of services the cloud provides. If you want me to do deep dives on some specific topic in these, do sound off in the comments.

If you liked what you read, you can try reading some other posts on my blog as well, and you can also connect with me on my socials. Until next time. 😊

## References

This post will not have been possible without these 2 amazing references. If you think this post was good, just take a look at these resources 🤯

1. [The Big Little Guide to Running Code in the Cloud(s)](https://sudhir.io/the-big-little-guide-to-running-code-in-the-clouds)
2. [Fireship's Cloud Computing in the Year 2020 video](https://www.youtube.com/watch?v=1pBuwKwaHp0)
3. [Guide to Microsoft Azure, Pizza as a Service Example](https://www.crmsoftwareblog.com/2020/10/a-guide-to-microsoft-azure-your-crm-pizza-as-a-service-example)
