export const SHOP_BRAND = {
  name: "TestTopia",

  colors: {
    primary: {
      base: "rgb(15, 118, 110)",
      hover: "rgb(13, 98, 92)",
      text: "#ffffff",
      tailwind: {
        bg: "bg-teal-700",
        bgHover: "hover:bg-teal-800",
        border: "border-teal-700",
        text: "text-white",
        focusRing: "focus:ring-teal-600",
      },
    },

    secondary: {
      base: "rgb(20, 184, 166)",
      hover: "rgb(15, 118, 110)",
      text: "#ffffff",
      tailwind: {
        bg: "bg-teal-500",
        bgHover: "hover:bg-teal-600",
        border: "border-teal-500",
        text: "text-white",
        focusRing: "focus:ring-teal-400",
      },
    },

    neutral: {
      bg: "bg-gray-200",
      bgHover: "hover:bg-gray-300",
      border: "border-gray-300",
      text: "text-gray-700",
    },

    surface: {
      page: "bg-gray-50",
      card: "bg-white",
      input: "bg-white",
    },

    text: {
      heading: "text-gray-900",
      body: "text-gray-700",
      muted: "text-gray-500",
      price: "text-teal-700",
    },

    state: {
      success: "bg-green-500",
      disabled: "bg-gray-300",
      disabledText: "text-gray-400",
    },
  },

  font: {
    family: "system-ui, -apple-system, sans-serif",
    heading: "font-bold",
    body: "font-normal",
    label: "font-medium",
    button: "font-semibold",
  },
} as const;

export const CTA_CLASSES = `${SHOP_BRAND.colors.primary.tailwind.bg} ${SHOP_BRAND.colors.primary.tailwind.bgHover} ${SHOP_BRAND.colors.primary.tailwind.text} font-semibold transition-colors`;

export const SELECTED_VARIANT_CLASSES = `${SHOP_BRAND.colors.secondary.tailwind.border} ${SHOP_BRAND.colors.secondary.tailwind.bg} ${SHOP_BRAND.colors.secondary.tailwind.text} shadow-sm`;

export const UNSELECTED_VARIANT_CLASSES = `${SHOP_BRAND.colors.neutral.border} text-gray-900 ${SHOP_BRAND.colors.neutral.bgHover}`;

export const INACTIVE_BUTTON_CLASSES = `${SHOP_BRAND.colors.neutral.bg} ${SHOP_BRAND.colors.neutral.bgHover} ${SHOP_BRAND.colors.neutral.text} font-medium transition-colors`;
