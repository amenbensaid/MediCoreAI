const axios = require('axios');

const API_BASE = 'http://localhost:5101/api';

// Login credentials (using existing admin user)
const loginData = {
    email: 'admin@medicore.com',
    password: 'admin123'
};

const doctorAvatars = [
    {
        id: 1,
        avatarUrl: '/uploads/profile-images/doctor1-avatar.jpg'
    },
    {
        id: 2,
        avatarUrl: '/uploads/profile-images/doctor2-avatar.jpg'
    },
    {
        id: 3,
        avatarUrl: '/uploads/profile-images/doctor3-avatar.jpg'
    }
];

async function updateDoctorAvatars() {
    console.log('🔄 Logging in to get token...');
    
    try {
        // Login to get token
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, loginData);
        const token = loginResponse.data.data.token;
        
        console.log('✅ Login successful');
        
        // Update each doctor's avatar
        for (const doctor of doctorAvatars) {
            console.log(`🔄 Updating avatar for doctor ID ${doctor.id}...`);
            
            try {
                const updateResponse = await axios.put(
                    `${API_BASE}/auth/profile`,
                    {
                        firstName: 'Doctor',
                        lastName: `Test${doctor.id}`,
                        avatarUrl: doctor.avatarUrl
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                console.log(`✅ Updated avatar for doctor ID ${doctor.id}`);
                console.log(`   Avatar URL: ${doctor.avatarUrl}`);
                
            } catch (error) {
                console.error(`❌ Failed to update doctor ID ${doctor.id}:`, error.response?.data || error.message);
            }
        }
        
        // Verify the updates by fetching doctors
        console.log('\n🔍 Verifying updates...');
        try {
            const doctorsResponse = await axios.get(`${API_BASE}/public/practitioners`);
            const doctors = doctorsResponse.data.data;
            
            console.log('\n📋 Current doctors and their avatars:');
            doctors.forEach(doctor => {
                console.log(`ID: ${doctor.id} - ${doctor.name} - Avatar: ${doctor.avatarUrl || 'None'}`);
            });
            
        } catch (error) {
            console.error('❌ Failed to fetch doctors for verification:', error.message);
        }
        
        console.log('\n✅ Doctor avatars update process completed');
        
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
    }
}

updateDoctorAvatars();
