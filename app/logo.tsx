import Image from "next/image"

export default function Logo({ className }: { className?: string }) {
  return <Image src="/log.png" alt="Dialogue for Delivery Logo" width={32} height={32} className={className} />
}

