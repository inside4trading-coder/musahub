import type { Variants } from 'framer-motion'

export const EASING = [0.16, 1, 0.3, 1] as const

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASING } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: EASING } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } },
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: EASING } },
}

export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASING } },
  exit: { opacity: 0, x: 32, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
}

export const slideFromBottom: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASING } },
  exit: { opacity: 0, y: 24, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
}
