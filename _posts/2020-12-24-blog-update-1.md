---
toc: false
layout: post
description: An update on the tech stack and look of my blog.
categories: [fastpages, blog, about]
title: Blog Update 1
comments: true
---

Hey there. It's been a long time since I wrote a new post like this one (or tbh any post). I wanted to share an update to my blog.

If you've been a reader previously (which is higly unlikely), you may have seen that the blog looks quite different now. I changed my blog tech stack from Gatsby to Fastpages and considered sharing my reasons and experience in the process. Now you can comment on my blog posts, search posts using a search feature and even find posts based on categories.

## Choosing the right tech stack

I created the v1 of my blog using Gatsby JS and it resounded to a time where I was learning about JS and React JS. But customizing the blog and adding features like Comments and Search was not trivial using the theme I used and I didn't want to change my theme, because it looked wonderful.

Then I tried switching to Hugo, which I felt was a bit more easy to customize and blazingly fast, but again, I had to setup comments and search manually.

Then I saw the release of **fastpages** by _fastai_ and thought whether this could be a right choice for my blogging needs or not. I loved how they let you setup comments using a simple config changes, has search and categorization using tags built in. It serves all my syntax highlighting and adding LaTeX Math Equations to my blog needs, lets me share Jupyter notebooks as blog posts and sets up CI quite easily. I tried it for my blog and I loved the experience, so I changed the tech stack for my blog, and while I am not completely okay with how few things work in fastpages, it serves my basic blogging needs quite well. I will share the issues that I encounter with Fastpages in this post and be on the lookout for a future post on how to create your own blog using Fastpages

## My Issues with Fastpages

While I love fastpages in terms of the features it provides, here are some issues I have with it. Do note that these are a bit subjective and might not be completely relevant to you, but here it is:

1. The Jekyll Stack and Developer Experience is not fun. Fastpages uses Jekyll to generate this site and I do not know that or Ruby yet. Plus to locally run this blog, I need `docker` etc in my system, which although not a big deal, its one I'd like to avoid, vs a single executable for Hugo or a npm CLI tool in case of Gatsby.
2. Theme customization options are limited. Again I feel this is something I endure more since I don't know Jekyll, but if you want your blog to look unique or want to change the whole look as easy as flipping to a different theme, it's not possible, until you know how to tinker with Jekyll and custom css files.
3. Referencing images. I had to change my image references from `[Alt Text](Image-Location)` to `![]({{ site.baseurl }}/images/Image-Location)`. Gatsby had a separate image folder for each posts versus fast pages having a single location for all the images. I will try to fix this issue if possible though.

All these issues aside, Fastpages is a great way to setup a blog easily with most of features one might need, and you should definitely consider it to set up a statically generated blog hosted on GitHub pages. Do try it out and share your experiences in the comments below.