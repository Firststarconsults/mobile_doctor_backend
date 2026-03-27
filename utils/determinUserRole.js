// Function to determine the role based on the userType field
const determineRole = (userType) => {
    switch (userType) {
        case 'doctor':
            return 'doctor';
        case 'patient':
            return 'patient';
        case 'pharmacy':
            return 'pharmacy';
        case 'laboratory':
            return 'laboratory';
        case 'therapist':
            return 'therapist';
        default:
            return 'patient';
    }
};



export default determineRole