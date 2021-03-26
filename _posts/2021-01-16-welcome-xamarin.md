---
toc: false
layout: post
description: My plans and upcoming things I might write about on this blog.
categories: [C#, xamarin, blog]
title: Hello Xamarin (And 2021)
comments: true
---

Hey there. So I planned to do this, at least not 15 days later into the year. 2020 has been a mess of an year and eventhough, on the surface, the start might not be awesome, I have better hopes and goals for 2021. One of these goals is to write even more in this blog (considering I've written, what like 6 posts in 5 months?). We will see how that pans out in the future, but here is one update that I'd like to share, and the topic you might see future posts on.

So I wanted to write an Android App, for a personal usecase. It's not that esoteric and an app already exists for it. Then why write one? Because the app required a purchase to keep working and I had a feeling I can create the same app, without the need of any purchase or ads. Now I don't really plan to distribute this app on Google Play Store, so other than my "man-hours" and time spent in creating it, I wouldn't be having any kind of monetary investment in this. Since its a personal usecase and the app will be written by me only, I am okay with installing it on my phone. So then came the first hurdle in this journey, how to start and which tech stack to use?

## The Options

Now I know, the title kindo spoils my end choice, but I'll still like to share why I choose Xamarin. Since I know nothing about app development and not really good at UI development as well, I wanted an easy entry point for my first ever Android App. (Yes, I've gotten around doing my Bachelors and Masters without writing a single Android app 😋). I knew a fair amount of JavaScript and TypeScript, but I am not good at UI development, so I skipped React-Native, eventhough it being one of my primary choices (since the library code I wanted to write could be written in JS/TS easily) and I didnt wanna learn, yet another JS framework, so skipped Ionic and Cordova as well. I didn't want to learn yet another language as well, since currently my focus has been on how to write good and maintainable code in the languages I know, so eventhough being similar to JavaScript, I skipped Dart & Flutter. I skipped Kotlin, and all the other native Android stuff Google provides, alongwith Android Studio, primarily because Android Studio is very resource intensive and might just kill my laptop. Plus again, I didn't wanna learn another language (Kotlin).

If you've been following the blog, you might have noticed that I have been working in C# from some time. I remembered Microsoft creating `Xamarin` for cross platform app development. Hence I chose Xamarin. I already have Visual Studio on my laptop, I need to practice writing better C# code anyways. Plus I wanted to do all the processing required for this app on-device and not rely on some web service (since they can add/create costs), I thought it would be a good experience in writing that code in C# and learn how to do "more" using C#. Hence I chose Xamarin as my tool (or framework?) of choice.

## Where I am learning Xamarin from?

So I had heard about Xamarin University when I first read about Xamarin. But then I saw that it got closed and some of its content was available on YouTube and their public GitHub repo which is archived. Now I didn't have much time to go through various public repos and old videos, plus I prefer reading + doing a tad bit more for learning. So I went to the place where Xamarin University went, **Microsoft Learn**. I saw two main modules that I feel should give me a good enough intro to Xamarin. First is the module [Build Mobile Apps with Xamarin](https://docs.microsoft.com/en-us/learn/paths/build-mobile-apps-with-xamarin-forms/) and then I plan to continue with [Customize Xamarin Forms App & Advanced Features](https://docs.microsoft.com/en-us/learn/paths/customize-your-xamarin-forms-apps/). Along the way I also plan to read a few books (and if needed watch a video or two). In terms of books, I have two on my radar. First is [Xamarin in Action](https://learning.oreilly.com/library/view/xamarin-in-action/9781617294389/) to understand the MVVM pattern and how to write good and testable code. Second is [Xamarin Projects](https://learning.oreilly.com/library/view/xamarinforms-projects-/9781839210051/) to see examples of how to build certain things with Xamarin in action.

## On a side note

I know my reasons/issues for choosing Xamarin are weird, and superficial and might not even match to your reasons/issues. Kotlin might be better if you are planning to do full time Android Development, React Native if you already know React and JS well and Dart if you want to learn an awesome new tooling. That being said, do give Xamarin a try.

I'll definitely keep you, my readers updated with my experience and pitfalls of using Xamarin and C#, and my progress with this app I'm trying to write.

Do comment if you have suggestions for resources to learn Xamarin, or if you want to share your experience of using Xamarin. Until next time. 😀