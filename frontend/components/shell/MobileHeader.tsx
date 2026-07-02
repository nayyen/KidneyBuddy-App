"use client";


export default function MobileHeader() {
  return (
    <header
      data-print-hidden="true"
      className="flex lg:hidden items-center justify-between w-full bg-white shrink-0"
      style={{
        height: 56,
        paddingLeft: 16,
        paddingRight: 16,
        borderBottom: "0.5px solid #f0faf9",
      }}
    >
      {/* App name */}
      <span
        className="font-heading font-bold"
        style={{ fontSize: 16, color: "#2a9d8f" }}
      >
        KidneyBuddy
      </span>

    </header>
  );
}
