Deno.serve(async (req) => {
  const { url } = await req.json();
  const res = await fetch(url);
  const text = await res.text();
  return Response.json({ content: text });
});