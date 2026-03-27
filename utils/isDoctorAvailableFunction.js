// services/doctorService.js

import ConsultationSession from '../models/consultationModel.js';
import {Prescription} from '../models/services.js';

/**
 * Check if a doctor is available for a new consultation.
 * @param {string} doctorId - The ID of the doctor.
 * @returns {boolean} - True if the doctor is available, false otherwise.
 */
export const isDoctorAvailable = async (doctorId) => {
    // Check if the doctor has any active consultation that is not in-progress due to lab tests
    const activeConsultation = await ConsultationSession.findOne({
        doctor: doctorId,
        status: { $in: ["in-progress", "pending"] } // Include any additional statuses if needed
    });

    // If an active consultation exists and it is not for lab tests, doctor is not available
    if (activeConsultation) {
        const prescription = await Prescription.findOne({ session: activeConsultation._id }).sort({ createdAt: -1 });
        if (prescription && prescription.providerType === "laboratory" && prescription.status === "pending") {
            // The doctor is engaged in an "in-progress" session for lab results, so consider them available
            return true;
        }
        return false;
    }
    
    return true; // Doctor is available if no active consultation is found
};


