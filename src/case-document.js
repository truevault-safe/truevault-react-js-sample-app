class CaseDocument {
    constructor(caseId, name, sex, dob, patientHeight, patientWeight, dueDate, caseImageIds) {
        this.caseId = caseId;
        this.patientName = name;
        this.sex = sex;
        this.dob = dob;
        this.patientHeight = patientHeight;
        this.patientWeight = patientWeight;
        this.dueDate = dueDate;
        this.caseImageIds = caseImageIds;
    }
}

module.exports = CaseDocument;
