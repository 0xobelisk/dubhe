import * as React from 'react';
import { motion } from 'framer-motion';

// Animation effect for sliding to specified position
const visible = { opacity: 1, y: 0, transition: { duration: 0.5 } };

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible,
};
const InertiaTitle = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 1 } }}
      variants={{
        visible: {
          opacity: 1,
          transition: { duration: 2 },
        },
      }}
      transition={{ type: 'inertia', velocity: 180 }}
      viewport={{ once: true }}
    >
      <div className="w-full">{children}</div>
    </motion.div>
  );
};
const TweenTitle = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 1 } }}
      variants={{
        visible: {
          opacity: 1,
          transition: { duration: 2 },
        },
      }}
      transition={{ duration: 1, type: 'tween', delay: 0.01 }}
      viewport={{ once: true }}
    >
      <div className="w-full">{children}</div>
    </motion.div>
  );
};

const Animation = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 1 } }}
      variants={{
        visible: {
          opacity: 1,
          transition: { duration: 2 },
        },
      }}
      transition={{ type: 'spring', stiffness: 300, delay: 0.01 }}
      viewport={{ once: true }}
    >
      <div className="w-full">{children}</div>
    </motion.div>
  );
};

export { InertiaTitle, Animation, TweenTitle };
