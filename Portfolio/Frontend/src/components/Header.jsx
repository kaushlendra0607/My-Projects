import { useState } from "react";
// import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";


export function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const navLinks = ["Home", "About", "Projects", "Contact"];
    return (
        <>
            <header className="header">
                <p className="devfolio">DEVFOLIO</p>
                <nav className="navbar">
                    <ul className="nav-list">
                        <li className="nav-items"><a href="#">Home</a></li>
                        <li className="nav-items"><a href="#">About</a></li>
                        <li className="nav-items"><a href="#">Projects</a></li>
                        <li className="nav-items"><a href="#">Contact</a></li>
                    </ul>
                </nav>
                <div className={isOpen ? "hamOpen" : "ham"}
                 onClick={() => { setIsOpen(!isOpen) }}>
                    {isOpen ? <X size={28} /> : <Menu size={28} />}
                </div>
                {isOpen &&
                    <ul className="mobile-menu">
                        {navLinks.map((link) => (
                            <li key={link}>
                                <a
                                    href={`#${link.toLowerCase()}`}
                                    className="mobile-menu-links"
                                    onClick={() => setIsOpen(false)}
                                >
                                    {link}
                                </a>
                            </li>
                        ))}
                    </ul>
                }
                {/* <div className="ham">&#9776;</div> */}
            </header>
        </>
    );
}