

export function Footer() {
    return (
        <>
            <footer className="footer">
                <section className="footer-links">
                    <ul className="footer-page-links">
                        <li><a href="#">Home</a></li><span className="dot">&middot;</span>
                        <li><a href="#">About</a></li><span className="dot">&middot;</span>
                        <li><a href="#">Projects</a></li><span className="dot">&middot;</span>
                        <li><a href="#">Contact</a></li>
                    </ul>
                    <ul className="footer-media-links">
                        <li><a href="#"><i className="fa-brands fa-linkedin-in"></i></a></li>
                        <li><a href="#"><i className="fa-brands fa-github"></i></a></li>
                        <li><a href="#"><i className="fa-brands fa-x-twitter"></i></a></li>
                    </ul>
                </section>
                <p>Built with ❤️ using HTML, CSS, and JavaScript.</p>
                <p>© 2025 Shikhar. All rights reserved.</p>
            </footer>
        </>
    );
}