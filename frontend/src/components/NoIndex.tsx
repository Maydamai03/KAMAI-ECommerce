import { usePrivatePage } from "../hooks/usePageMeta";

export default function NoIndex({ title }: { title: string }) {
  usePrivatePage(title);
  return null;
}