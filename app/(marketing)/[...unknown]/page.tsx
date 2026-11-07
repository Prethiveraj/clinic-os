import { notFound } from "next/navigation";

/** Any unmatched path on the main site: answer 404 inside the marketing layout. */
export default function UnknownPage() {
  notFound();
}
