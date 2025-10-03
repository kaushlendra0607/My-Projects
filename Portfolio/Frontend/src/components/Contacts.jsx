

export function Contact() {
    return (
        <>
            <section className="contacts">
                <h2 className="primary-heading">📬Get In Touch</h2>
                <p>Let's build something great together.<br/>Feel free to reach out via email or connect with me on social media!
                </p>
                <div className="contact-links">
                    <a target="_blank" href="mailto:kaushlendrapratapsingh631@gmail.com" className="btn">
                        <i className="fa-solid fa-square-envelope contact-icon"></i> Email Me
                        
                    </a>
                    <a target="_blank" href="https://www.linkedin.com/in/kps2004/" className="btn">
                        <i className="fa-brands fa-linkedin-in contact-icon"></i> Connect On LinkedIn
                    </a>
                    <a target="_blank" href="https://github.com/kaushlendra0607" className="btn">
                        <i className="fa-brands fa-github contact-icon"></i> View My GitHub
                    </a>
                </div>
            </section>
        </>
    );
}