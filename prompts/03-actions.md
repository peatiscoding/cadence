# Hook & Actions

To enhance our workflow configuration; what we need is a way to automate stuffs hence Hooks & Actions.

## Technical Aspect

Each of cards when transition there are 2 hotspot that we can hook the special actions to it. `transition` and `finally`. Both received the `IActionHook`. By design these cards once action taken it will perform these hooks on client side. We can enhance these feature to take in on server side later.

Here are the possible actions we have so far.
