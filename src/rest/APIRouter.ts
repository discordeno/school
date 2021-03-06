import RESTManager from "./RESTManager.ts";

const noop = () => {};
const methods = ["get", "post", "delete", "patch", "put"];
const reflectors = [
  "toString",
  "valueOf",
  "inspect",
  "constructor",
  Symbol.toPrimitive,
  Symbol.for("nodejs.util.inspect.custom"),
];

function buildRoute(manager: RESTManager) {
  const route = [""];
  const handler = {
    // @ts-ignore is there really no better way
    get(_target: unknown, name: string) {
      if (reflectors.includes(name)) return () => route.join("/");
      if (methods.includes(name)) {
        const routeBucket: string[] = [];
        for (let i = 0; i < route.length; i++) {
          // Reactions routes and sub-routes all share the same bucket
          if (route[i - 1] === "reactions") break;
          // Literal IDs should only be taken account if they are the Major ID (the Channel/Guild ID)
          if (/\d{16,19}/g.test(route[i]) && !/channels|guilds/.test(route[i - 1])) routeBucket.push(":id");
          // All other parts of the route should be considered as part of the bucket identifier
          else routeBucket.push(route[i]);
        }
        return (options: Record<string, unknown>) =>
          manager.request(
            name,
            route.join("/"),
            Object.assign(
              {
                versioned: manager.versioned,
                route: routeBucket.join("/"),
              },
              options
            )
          );
      }
      route.push(name);
      return new Proxy(noop, handler);
    },
    // @ts-ignore is there really no better way
    apply(_target: unknown, _: unknown, args: string[]) {
      route.push(...args.filter((x) => x != null));
      return new Proxy(noop, handler);
    },
  };
  return new Proxy(noop, handler);
}

export default buildRoute;
