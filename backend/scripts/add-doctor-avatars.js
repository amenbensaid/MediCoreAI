const db = require('../src/config/database');

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

async function addDoctorAvatars() {
    console.log('Adding avatars to doctors...');
    
    try {
        for (const doctor of doctorAvatars) {
            const result = await db.query(
                'UPDATE users SET avatar_url = $1 WHERE id = $2 AND role = \'practitioner\'',
                [doctor.avatarUrl, doctor.id]
            );
            
            if (result.rowCount > 0) {
                console.log(`✅ Added avatar for doctor ID ${doctor.id}`);
            } else {
                console.log(`❌ No doctor found with ID ${doctor.id}`);
            }
        }
        
        console.log('✅ Doctor avatars update completed');
        
        // Verify the updates
        const verifyResult = await db.query(
            'SELECT id, first_name, last_name, avatar_url FROM users WHERE role = \'practitioner\' ORDER BY id'
        );
        
        console.log('\n📋 Current doctors with avatars:');
        verifyResult.rows.forEach(doctor => {
            console.log(`ID: ${doctor.id} - Dr. ${doctor.first_name} ${doctor.last_name} - Avatar: ${doctor.avatar_url || 'None'}`);
        });
        
    } catch (error) {
        console.error('❌ Error adding doctor avatars:', error);
    } finally {
        process.exit(0);
    }
}

addDoctorAvatars();
