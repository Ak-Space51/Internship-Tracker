import { redirect } from "next/navigation";

/** Saved jobs became one status inside the tracker; keep the old path working
 * for anyone who bookmarked it. */
export default function SavedPage() {
  redirect("/tracker");
}
