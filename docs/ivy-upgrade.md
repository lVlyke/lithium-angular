# Upgrading to Ivy

## What is Ivy?

Ivy is Angular's new view renderer and is now the default renderer as of Angular 9.

## What changes do I need to make to my app to make it compatible with Ivy?

Make sure your project is using Lithium 5.0.0 or newer. After upgrading, your app should now be compatible with Ivy!

After the upgrade, please make the following changes to ensure your app remains compatible with Ivy:

* Extend the [```LiComponent```](/docs/api-reference.md#licomponent) base class instead of the previous ```AotAware``` base class, which has been removed. [Read here](/docs/limitations.md) for more info.