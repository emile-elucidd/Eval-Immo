import { redirect } from "next/navigation";

/**
 * Anything that matched no route at all.
 *
 * A visitor who mistyped a URL still wants an estimate, and the generic landing
 * offers exactly that — so a dead link becomes the home page rather than a dead
 * end. Unknown agencies and communes are redirected earlier, in
 * `requireLanding`, which can send them somewhere better: a real agency with a
 * wrong commune stays on that agency's own site.
 */
export default function NotFound() {
  redirect("/");
}
