import Image from "next/image";
import styles from "./team.module.css";
import { Navbar } from "../components/Navbar";

export const metadata = {
  title: "Team",
};

export default function TeamPage() {
  return (
    <>
      <Navbar activePath="/team" />
      <main className={styles.container}>
        <h1 className={styles.heading}>Contributors</h1>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.avatar}>
              <Image
                src="/assets/kushagra.png"
                alt="Kushagra K."
                fill
                sizes="(max-width: 600px) 80vw, 300px"
                className={`${styles.avatarImg} ${styles.kushagraShift}`}
              />
            </div>
            <div className={styles.name}>Kushagra K.</div>
            <a
              className={styles.link}
              href="https://www.linkedin.com/in/kushagrakatiyar/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </div>

          <div className={styles.card}>
            <div className={styles.avatar}>
              <Image
                src="/assets/madhu.png"
                alt="Madhu B."
                fill
                sizes="(max-width: 600px) 80vw, 300px"
                className={styles.avatarImg}
              />
            </div>
            <div className={styles.name}>Madhu B.</div>
            <a
              className={styles.link}
              href="https://www.linkedin.com/in/madhurishitha-boddu-a2b80731b/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
