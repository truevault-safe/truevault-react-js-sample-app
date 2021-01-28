/**
 * TrueDiagnostics stores PII in TrueVault, and non-PII with a NodeJS server. The client in this file
 * makes it easy for application code to access this NodeJS server, by insulating the rest of the application
 * from the HTTP requests expected by the NodeJS server.
 */
class InternalApiClient {

    constructor(urlPrefix) {
        this.urlPrefix = urlPrefix;
    }

    headers(tvAccessToken) {
        return {
            'X-TV-Access-Token': tvAccessToken,
            'Content-Type': 'application/json'
        };
    }

    async createCase(tvAccessToken, caseDocId, diagnosisDocId, approverId, reviewerId, readGroupId) {
        const response = await fetch(`${this.urlPrefix}/api/case`, {
            method: 'POST',
            body: JSON.stringify({
                caseDocId,
                diagnosisDocId,
                approverId,
                reviewerId,
                readGroupId
            }),
            headers: this.headers(tvAccessToken)
        });

        if (response.status !== 201) {
            throw Error('Invalid response');
        }
    }

    async getCase(tvAccessToken, caseDocId) {
        const response = await fetch(`/api/case/id/${caseDocId}`, {
            headers: this.headers(tvAccessToken)
        });
        const responseJson = await response.json();
        if (response.status !== 200 || responseJson.length !== 1) {
            throw Error('Invalid response');
        }
        return responseJson[0];
    }

    async getCases(tvAccessToken, documentIds) {
        if (documentIds.length === 0) {
            return [];
        }

        const response = await fetch(`/api/case/id/${documentIds.join(',')}`, {
            headers: this.headers(tvAccessToken)
        });
        if (response.status !== 200) {
            throw Error('Invalid response');
        }
        return response.json();
    }

    async listMyCases(tvAccessToken) {
        const response = await fetch('/api/case/mine', {
            headers: {
                'X-TV-Access-Token': tvAccessToken
            }
        });
        if (response.status !== 200) {
            throw Error('Invalid response');
        }
        return response.json();
    }

    async reviewCase(tvAccessToken, caseDocId) {
        const response = await fetch(`${this.urlPrefix}/api/case/id/${caseDocId}/review`, {
            method: 'POST',
            headers: this.headers(tvAccessToken)
        });
        if (response.status !== 200) {
            throw Error('Invalid response');
        }
    }

    async approveCase(tvAccessToken, caseDocId) {
        const response = await fetch(`${this.urlPrefix}/api/case/id/${caseDocId}/approve`, {
            method: 'POST',
            headers: this.headers(tvAccessToken)
        });
        if (response.status !== 200) {
            throw Error('Invalid response');
        }
    }

    async associateCaseWithPatient(tvAccessToken, caseDocId, patientUserId, patientUserApiKey) {
        const response = await fetch(`${this.urlPrefix}/api/case/id/${caseDocId}/patient`, {
            method: 'POST',
            headers: this.headers(tvAccessToken),
            body: JSON.stringify({patientUserId, patientUserApiKey})
        });
        if (response.status !== 200) {
            throw Error('Invalid response');
        }
    }

    async getAdminDashboardStats(tvAccessToken) {
        console.log("admin-stats tvAccessToken", tvAccessToken);
        const response = await fetch(`${this.urlPrefix}/api/dashboard/stats`, {
            headers: this.headers(tvAccessToken)
        });
        if (response.status !== 200) {
            throw Error('Invalid response');
        }
        return response.json();
    }

    async getPatientCase(tvAccessToken) {
        const response = await fetch(`${this.urlPrefix}/api/case/patient`, {
            headers: this.headers(tvAccessToken)
        });
        if (response.status !== 200) {
            throw Error('Invalid response');
        }
        return response.json();
    }
}

module.exports = InternalApiClient;
