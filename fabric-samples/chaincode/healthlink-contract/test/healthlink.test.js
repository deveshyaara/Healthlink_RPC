/* eslint-disable no-unused-expressions */

const { Contract } = require('fabric-contract-api');
const { Context } = require('fabric-contract-api');
const HealthLinkContract = require('../index.js');

const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const { ChaincodeStub } = require('fabric-shim');


chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('HealthLinkContract', () => {
  let contract;
  let ctx;
  let stub;

  beforeEach(() => {
    contract = new HealthLinkContract();
    ctx = new Context();
    stub = sinon.createStubInstance(ChaincodeStub);
    ctx.stub = stub;

    // Configure common stubs
    stub.putState.resolves(Buffer.from(''));
    stub.putPrivateData.resolves(Buffer.from(''));
    stub.setEvent.resolves(Buffer.from(''));
  });

  describe('CreatePatient', () => {
    it('should create a patient with public and private data', async () => {
      // --- Arrange ---
      const patientId = 'P105';
      const patientData = {
        patientId: patientId,
        name: 'Test Patient',
        dob: '2000-01-01',
        metaJson: '{}'
      };

      // 1. Mock the transient data
      const transientMap = new Map();
      transientMap.set('patient', Buffer.from(JSON.stringify(patientData)));
      stub.getTransient.returns(transientMap);

      // 2. Mock the public getState (to show patient doesn't exist)
      stub.getState.withArgs(patientId).resolves(undefined);

      // --- Act ---
      await contract.CreatePatient(ctx);

      // --- Assert ---

      // 3. Check that public data was saved correctly
      const expectedPublicData = { patientId: patientId, records: [] };
      stub.putState.should.have.been.calledWith(
        patientId, 
        Buffer.from(JSON.stringify(expectedPublicData))
      );

      // 4. Check that private data was saved correctly
      const expectedPrivateData = { patientId: patientId, name: 'Test Patient', dob: '2000-01-01', meta: {} };
      stub.putPrivateData.should.have.been.calledWith(
        'patientPrivateDetails',
        patientId,
        Buffer.from(JSON.stringify(expectedPrivateData))
      );

      // 5. Check that the event was set
      stub.setEvent.should.have.been.calledWith('PatientCreated', Buffer.from(patientId));
    });

    it('should throw an error if patient already exists', async () => {
      // --- Arrange ---
      const patientId = 'P106';
      const patientData = { patientId: patientId, name: 'Test Patient', dob: '2000-01-01', metaJson: '{}' };

      const transientMap = new Map();
      transientMap.set('patient', Buffer.from(JSON.stringify(patientData)));
      stub.getTransient.returns(transientMap);

      // Mock getState to return an existing patient
      stub.getState.withArgs(patientId).resolves(Buffer.from('{"patientId":"P106"}'));

      // --- Act & Assert ---
      // To this line:
      return contract.CreatePatient(ctx)
       .should.be.rejectedWith(`Patient ${patientId} already exists`);
    });
  });
});
