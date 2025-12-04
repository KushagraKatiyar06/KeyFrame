import Link from "next/link";
import Image from "next/image";
import styles from "./Navbar.module.css";

interface NavbarProps {
  activePath?: string;
}

export function Navbar({ activePath = "/" }: NavbarProps) {
  return (
    <nav className={styles.navbar}>
      {}
      <Link href="/" className={styles.logoLink}>
        <div className={styles.logoContainer}>
          <Image
            src="/assets/Logo_Transparent.png"
            alt="KeyFrame Home"
            width={48}
            height={48}
          />
        </div>
      </Link>

      {}
      <div className={styles.navLinks}>
        <Link
          href="/"
          className={`${styles.navLink} ${
            activePath === "/" ? styles.active : ""
          }`}
        >
          Generate
        </Link>
        <Link
          href="/feed"
          className={`${styles.navLink} ${
            activePath === "/feed" ? styles.active : ""
          }`}
        >
          Community
        </Link>
        <Link
          href="/team"
          className={`${styles.navLink} ${
            activePath === "/team" ? styles.active : ""
          }`}
        >
          Team
        </Link>
      </div>
    </nav>
  );
}
