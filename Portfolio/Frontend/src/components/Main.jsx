import { useState, useEffect } from "react";
import Profile  from "../assets/profile_pic.jpg"

function Typewriter(){
     const [wordIndex, setWordIndex] = useState(0); // current word
     const [text, setText] = useState(""); // what’s being typed
     const [isDeleting, setIsDeleting] = useState(false); // typing or deleting?
     const [speed, setSpeed] = useState(150); // typing speed

    useEffect(()=>{
        const words = ["an Engineer","a Learner","a Developer"];
        const currentWord = words[wordIndex];
        let timeout;
        setSpeed(150);
        if(isDeleting){//deleting
            timeout = setTimeout(() => {
                setText(currentWord.substring(0, text.length - 1));
            }, speed / 2);
        } else{//writing
            timeout = setTimeout(() => {
                setText(currentWord.substring(0, text.length + 1));
            }, speed);
        }

        if(!isDeleting && text === currentWord){
            // when word is fully typed take a pause
             timeout = setTimeout(() => setIsDeleting(true), 1200);
        }
        else if (isDeleting && text === "") {
            //when word is fully deleted
            setIsDeleting(false);
            setWordIndex((prev) => (prev + 1) % words.length); // go to next word
        }

        return () => clearTimeout(timeout);
    },[text,isDeleting,wordIndex,speed]);

    return(
        <>
            <p className="changing-title">
                I'm <span id="dynamic-text" style={{color:"tomato"}}>{text}</span>
            </p>
        </>
    );

}

export function Main() {

    return (
        <>
            <main className="main two-column">
                <section className="main-description">
                    <p className="greet">
                        Hi, I'm Shikhar 👋
                    </p>
                    <Typewriter/>
                    <p className="main-intro">
                        I'm a Computer Science Engineer and full-stack web developer.
                        I love learning new technologies, solving problems, and building
                        impactful projects. I'm always striving to improve and excited to
                        take on new opportunities.
                    </p>
                    <p className="thankyou">THANK YOU !</p>
                    <a href="#" className="main-contact">Contact Me</a>
                </section>
                <section className="main-photo">
                    <img className="photo" src={Profile} alt="Shikhar's Profile Image"/>
                </section>
            </main>
        </>
    );
}