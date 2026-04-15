export const SHOP_BRAND = {
  name: "TestTopia",

  colors: {
    primary: {
      base: "rgb(79, 70, 229)",
      hover: "rgb(67, 56, 202)",
      text: "#ffffff",
      tailwind: {
        bg: "bg-indigo-600",
        bgHover: "hover:bg-indigo-700",
        border: "border-indigo-600",
        text: "text-white",
        focusRing: "focus:ring-indigo-500",
      },
    },

    secondary: {
      base: "rgb(99, 102, 241)",
      hover: "rgb(79, 70, 229)",
      text: "#ffffff",
      tailwind: {
        bg: "bg-indigo-400",
        bgHover: "hover:bg-indigo-500",
        border: "border-indigo-400",
        text: "text-white",
        focusRing: "focus:ring-indigo-400",
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
      price: "text-indigo-600",
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
