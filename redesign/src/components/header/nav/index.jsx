import styles from './style.module.scss';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { height } from '../anim';
import Body from './body';

import Image from './Image';

const links = [
  {
    title: "Home",
    href: "/",
    src: "home.jpg"
  },
  {
    title: "Services",
    href: "/digital-print",
    src: "service.jpg"
  },
  {
    title: "Upload",
    href: "/upload",
    src: "upload.jpg"
  },
  {
    title: "About",
    href: "/about",
    src: "about.jpg"
  },
  {
    title: "Policy",
    href: "/policy",
    src: "Policies.jpg"
  },
  {
    title: "Reviews",
    href: "/reviews",
    src: "review.jpg"
  }
]

export default function Index() {

  const [selectedLink, setSelectedLink] = useState({isActive: false, index: 0});

  return (
    <motion.div variants={height} initial="initial" animate="enter" exit="exit" className={styles.nav}>
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <Body links={links} selectedLink={selectedLink} setSelectedLink={setSelectedLink}/>
        </div>
        <Image src={links[selectedLink.index].src} isActive={selectedLink.isActive}/>
      </div>
    </motion.div>
  )
}