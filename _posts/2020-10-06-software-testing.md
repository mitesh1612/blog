---
toc: false
layout: post
description: Discover different types of tests and testing strategies.
categories: [testing, python, unit-tests]
title: A Primer on Different Kinds of Tests
image: images/2020-10-06-software-testing/hero.jpg
comments: true
---
I haven't been a developer for too long (yet) to justify or even explain the importance of well written tests, especially in your CI system, but over my experience in recent times, I have seen great tests helping me catch a lot of future headaches. That being said, while developing a service end-to-end, I got to see the different kinds of tests and testing strategies and I thought why not "blog my journey" on testing. So buckle up for a fun ride, into the land of testing.

## The Importance of Testing

If you are working on a decent codebase, chances are that the codebase has its own CI System, whether using GitHub Actions, Azure DevOps, Travis CI, Circle CI, Jenkins. One of the most important tasks for a CI System is to run tests on your codebase, preferably so that merging your PR doesn't break anything.

This is easier said, than done though. Having slow, long running tests in your Pull Request CI Builds slows down the check-in speed for a developer and makes you wait longer to get your changes merged. On the other hand, removing longer tests for something like Continuous Deployment builds puts you in the hazard of losing reliability and the quality signal of the master (or "main") branches. Then it becomes a blame game of finding what broke the test and getting it fixed. Surely there must be a better way.

## The different kinds of Tests

One of the main concerns for a test suite is the confusion around what each test should cover. Your tests might become too broad when they are expected to be focused or too focused when expected to have a broader testing. Thus, it becomes important to think about the kind of test you are writing while writing it. There are various ways to categorize tests. The famous types of tests are:

* Unit Tests
* Integration Tests
* Acceptance Tests

### Unit Tests

These are small, micro tests, that test a single class or method, **in isolation** from its dependencies. This part is important. When you isolate the code under test, the tests become more focused and expressive. A test that touches any external resource such as the database (even if it is mock), file system, web service etc. is not a Unit Test. (Or might be? Stay tuned)

The purpose of Unit Tests is to validate that the piece of code under test is functionally correct and giving the proper expected output for a given input. Good Unit Tests also help by providing a documentation on how the class is expected to function for any consumers.

#### What are good unit tests?

Good Unit Tests are fast, atomic, isolated, conclusive and generally order independent. Usually they are executed automatically by the CI server on each commit to the version control system.

You should be careful about categorizing tests as Unit Tests. Like Code Smells, there are a lot of smells for Unit Tests like too much setup, long test methods, race conditions, lack of CI Integration. If your Unit Tests have these smells, consider a good refactor styled bath for your codebase.

There are a lot of test frameworks for a lot of different languages, like NUnit for C#, pytest for Python etc. which I don't plan to cover here, they in general possess pretty good documentation. Although, stay tuned for another post on the various kinds of Unit Tests.

### Integration Tests

You use them when your test requires some kind of an external dependency. So these tests includes testing the code that interacts with some external components like a data access layer, web service, file system etc. These tests provide real value when they use the actual real dependency (and not something mock). But due to this, they are harder to setup and slower to write and run than unit tests. That being said, these tests are absolutely necessary to have some kind of confidence in your test suite.

The primary purpose of these tests is to validate the code that work or manipulates an external system, but they also sometimes validate a portion of the remote system. For example if you use a repository pattern for data access and have a test that performs a `Save()` on a database, this test also in part checks the database connection, database engine, the network connection (if not onprem) etc. These kind of tests exercise a large block of code and infrastructure than unit tests, but that makes more brittle.

#### What are good integration tests?

Good Integration Tests validate the features of an external system that is used in your application. They do not attempt to cover the full set of functionality. Like Unit Tests, ideally these tests should be atomic, isolated, conclusive and order independent.

Smells for Integration Tests also include too much setup, long test methods, race conditions, lack of continuous integration.

### Acceptance Tests

These are the tests that execute your entire stack, maybe not the user interface. Thus there is no usage of any kind of [test doubles](https://en.wikipedia.org/wiki/Test_double)  (mock objects/systems). The primary purpose of these tests is validate things like component wire up, application stack integration, basic use cases, system performance and stability. These tests are usually run the least often as they are time consuming to execute and require extensive setup (like deploying your services).

### What are good acceptance tests?

Good acceptance tests can be understood by a user and are written in terms common to business. Their code smells include attempting to validate every path through the system.

There are also the category of **UI Tests**, but to be honest, I'm not really experienced much in those to write something meaningful about them, so I'll be skipping those.

## Towards L0,L1,L2 Tests

Until now, all that I wrote seems kindo bookish, something you'd read in a Software Engineering book. So let me take you on a real tour of how testing is approached. In [this wonderful article about DevOps in Microsoft](https://docs.microsoft.com/en-us/azure/devops/learn/devops-at-microsoft/shift-left-make-testing-fast-reliable), these guys explain how breaking tests into L0,L1,L2 etc helps them simplify and drastically improve their testing approach.

To hillariously simplify and summarize this article, they divide their tests as L0 and L1 which are still your unit tests and L2 and L3 which are functional/integration/acceptance tests.

Usually, they favour tests with fewest external dependencies and run majority of tests as part of the build process for a commit. If tests aren't dependent, we could also run them in parellel, which gives faster CI build times. Although such L0 tests cannot test every aspect of the service, but the main point to not write a (functional) L2/L3 test where a (unit) L0 test could give the same information.

Since L2 and L3 tests are functional tests, they should always work with the public API of the product.

When we shift our focus on more L0 tests than L2/L3 tests, we make design implementations that support testability.

### Shift-Left

![Shift Left in Testing](https://docs.microsoft.com/en-us/azure/devops/learn/_img/shift-left.png)

This kind of shift left approach lets you finish most of the testing before a change is merged into the master.

### The new taxonomy of testing

In this way, tests were divided into the following categories:

* **L0 Tests**: These are the fast, in-memory unit tests, the basic idea of a Unit test to most people as well. These tests depend on the code in the assembly and nothing else. These can be testing your business logic with assertions where given input returns an expected output.
* **L1 Tests**: These are also Unit Tests but might require a Database or File System along with the assembly (can be mock). These dont include deploying the service. The most common tests here are for controller methods. For example say each route of your controller maps to a function, then you test that function (not deploy the controller) in a L1 test.

```python
# The controller route
@route(/:userId)
def getUser(userId):
    return userDb.Find(userId)

# The L1 Test
# Can set the db context to a mock db
def test_getUser():
    assert(getUser(1) == user[1])
```

(This might not look like an actual test for python code, but I wanted to represent how to test controllers without deploying the service and then calling the service api path)

* **L2 Tests**: These are Functional tests that run against "testable" service deployment. These require deploying the service but you might mock some service dependencies for ease. For example, deploying the service in a test environment and hitting the public API to perform basic use cases
* **L3 Tests**: These tests run against production and need a full product deployment.

There are some quite good guidelines in the article on how to write good L0 and L2 tests that I strongly insist you to read ([Unit Test Characteristics](https://docs.microsoft.com/en-us/azure/devops/learn/devops-at-microsoft/shift-left-make-testing-fast-reliable#unit-test-characteristics) and [Making Functional Tests Independent](https://docs.microsoft.com/en-us/azure/devops/learn/devops-at-microsoft/shift-left-make-testing-fast-reliable#functional-tests-must-be-independent)),  since I don't want to reiterate those same things.

## Improving your Test Game

While I did provide 2 different taxonomies for categorizing tests, these are not the only way to categorize them. I tried to cover the various famous categories and share the example of L0, L1, L2 and L3 tests that was tried and tested (😜) by me. While I might not be super knowledgeable in all the kinds of tests, you can share your experiences and techniques you use to improve your test suites, I'm open to discussion! 😁

If you liked this article, try reading some other articles on this blog. You can always follow me on my socials to connect, discuss with me.