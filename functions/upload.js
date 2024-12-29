export function onRequest(context) {
  console.log(context)
  return new Response("Hello, world!"+context.env.BASIC_USER)
}
