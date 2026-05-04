const authErrorKeys = {
    'Invalid credentials': 'auth.errors.invalidCredentials',
    'Please use the patient login page': 'auth.errors.usePatientLogin',
    'Account is deactivated': 'auth.errors.accountDeactivated',
    'Account pending platform admin approval': 'auth.errors.pendingPlatformApproval',
    'Login failed': 'auth.errors.loginFailed',
    'Patient account cannot use staff session': 'auth.errors.patientCannotUseStaff'
};

export const getLocalizedAuthError = (message, t, fallbackKey = 'auth.loginFailed') => {
    if (!message) {
        return t(fallbackKey);
    }

    const key = authErrorKeys[message];
    return key ? t(key) : message;
};
