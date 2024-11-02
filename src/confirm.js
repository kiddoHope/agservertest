// components/EmailTemplate.js
const React = require('react');

const Confirmation = ({codePass }) => {
  // Define styles as JavaScript objects
  const styles = {
    emailContainer: {
      height: 'auto',
      width: '100%',
      display: 'flex',
      justifyContent: 'center', // Changed this to justifyContent for proper flex alignment
      alignItems: 'center',
    },
    emailContent: {
      background: 'whitesmoke',
      padding: '2vw',
      borderRadius: '1vw',
      color: 'gray',
      width: 'fit-content', // Ensure content width adapts
      margin: '0 auto', // Centering the emailContent
    },
    agLogo: {
      display: 'flex',
      justifyContent: 'center',
      width: 'fit-content', // Ensure content width adapts
      margin: '0 auto', // Centering the AG logo
    },
    agLogoImg: {
      height: 'auto',
      width: '5vw',
    },
    emailTitle: {
      textAlign: 'center',
      fontSize: '1.2vw',
      margin: '0 auto', // Centering the title
    },
    resetImg: {
      display: 'flex',
      width: 'fit-content', // Ensure content width adapts
      justifyContent: 'center',
      padding: '1vw 0',
      margin: '0 auto', // Centering the reset image
    },
    resetImgSize: {
      height: 'auto',
      width: '10vw',
    },
    codeDiv: {
        textAlign: 'center',
        padding: '1vw',
        background: 'gray',
        boxSizing: 'border-box',
        width: '100%',
        borderRadius: '1vw'
    },
    user:{
        color: 'black',
        fontSize: '.8vw',
        fontWeight: '700',
    },
    recoverytxt: {
        color: 'whitesmoke',
        fontSize: '.7vw',
        margin: '0'
    },
    text: {
        fontSize: '.7vw'
    },
    emailRecoveryCode: {
      color: 'whitesmoke',
      fontSize: '1.5vw',
      fontWeight: '800',
      margin: '0'
    },
    emailExpirationNote: {
      // Add any specific styles for expiration note if needed
      color: '#c92424',
      fontSize: '.7vw',
      fontWeight: '500',
    },
  };

  return React.createElement('div', { style: styles.emailContainer },
    React.createElement('div', { style: styles.emailContent },
      React.createElement('div', { style: styles.agLogo },
        React.createElement('img', { src: 'https://2wave.io/AGEmailImages/AGLogoNameWhite.png', alt: "AG Logo", style: styles.agLogoImg }) // added alt text for better accessibility
      ),
      React.createElement('div', { style: styles.resetImg },
        React.createElement('img', { src: 'https://2wave.io/AGEmailImages/check-mail.png', alt: "Mail Image", style: styles.resetImgSize }) // added alt text for better accessibility
      ),
      React.createElement('h2', { style: styles.emailTitle }, "Verification Code"),
      React.createElement('p', { style: styles.user }, "Hello Gamer,"),
      React.createElement('p', { style: styles.text }, "We received a request to verify your Attract Game account. Please use the verification link and code below to complete the process:"),
      React.createElement('div', { style: styles.codeDiv },
        React.createElement('p', { style: styles.recoverytxt }, "Your Code"),
        React.createElement('h1', { style: styles.emailRecoveryCode }, codePass),
      ),
      React.createElement('p', { style: styles.emailExpirationNote }, "This code will expire in 7 days."),
      React.createElement('p', { style: styles.text }, "If you didn’t request a verification code, you can ignore this email."),
      React.createElement('p', { style: styles.text }, "Best Regards,", 
        React.createElement('br'), 
        "The Attract Game Team"
      )
    )
  );
};

module.exports = Confirmation;
