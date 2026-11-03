"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/form";

const OPTIONS = [
  ["relevancia", "Relevância"],
  ["popular", "Popularidade"],
  ["menor-preco", "Menor preço"],
  ["maior-preco", "Maior preço"],
  ["recentes", "Mais recentes"],
] as const;

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="ordem" className="text-xs whitespace-nowrap text-subtle">Ordenar por</label>
      <Select
        id="ordem"
        value={value}
        className="w-48"
        onChange={(e) => {
          const sp = new URLSearchParams(params.toString());
          if (e.target.value === "relevancia") sp.delete("ordem");
          else sp.set("ordem", e.target.value);
          sp.delete("page");
          router.push(`/produtos${sp.toString() ? `?${sp}` : ""}`);
        }}
      >
        {OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </Select>
    </div>
  );
}
