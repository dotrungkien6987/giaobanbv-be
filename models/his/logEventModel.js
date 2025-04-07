// src/models/logEventModel.js
const pool = require("../../config/dbConfig").default;

const getAllLogEvents = async () => {
  const res = await pool.query("SELECT * FROM logevent limit 100");
  return res.rows;
};

const getLogEventById = async (logeventid) => {
  const res = await pool.query("SELECT * FROM logevent WHERE logeventid = $1", [
    logeventid,
  ]);
  return res.rows[0];
};

const createLogEvent = async (logEventData) => {
  const {
    logapp,
    loguser,
    logform,
    softversion,
    logtime,
    ipaddress,
    computername,
    patientid,
    departmentgroupid,
    departmentid,
    logeventtype,
    logeventcontent,
    version,
    hosobenhanid,
    vienphiid,
    medicalrecordid,
    sothutuphongkhamid,
    maubenhphamid,
    servicepriceid,
    logeventcontentdetail,
    sync_flag,
    update_flag,
    bedrefid,
  } = logEventData;

  const res = await pool.query(
    `INSERT INTO logevent (
      logapp, loguser, logform, softversion, logtime, ipaddress, computername,
      patientid, departmentgroupid, departmentid, logeventtype, logeventcontent, version,
      hosobenhanid, vienphiid, medicalrecordid, sothutuphongkhamid, maubenhphamid,
      servicepriceid, logeventcontentdetail, sync_flag, update_flag, bedrefid
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, 
      $8, $9, $10, $11, $12, $13,
      
      $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23
    ) RETURNING *`,
    [
      logapp,
      loguser,
      logform,
      softversion,
      logtime,
      ipaddress,
      computername,
      patientid,
      departmentgroupid,
      departmentid,
      logeventtype,
      logeventcontent,
      version,
      hosobenhanid,
      vienphiid,
      medicalrecordid,
      sothutuphongkhamid,
      maubenhphamid,
      servicepriceid,
      logeventcontentdetail,
      sync_flag,
      update_flag,
      bedrefid,
    ]
  );
  return res.rows[0];
};

const updateLogEvent = async (logeventid, logEventData) => {
  const {
    logapp,
    loguser,
    logform,
    softversion,
    logtime,
    ipaddress,
    computername,
    patientid,
    departmentgroupid,
    departmentid,
    logeventtype,
    logeventcontent,
    version,
    hosobenhanid,
    vienphiid,
    medicalrecordid,
    sothutuphongkhamid,
    maubenhphamid,
    servicepriceid,
    logeventcontentdetail,
    sync_flag,
    update_flag,
    bedrefid,
  } = logEventData;

  const res = await pool.query(
    `UPDATE logevent SET
      logapp = $1, loguser = $2, logform = $3, softversion = $4, logtime = $5, 
      ipaddress = $6, computername = $7, patientid = $8, departmentgroupid = $9, 
      departmentid = $10, logeventtype = $11, logeventcontent = $12, version = $13,
      hosobenhanid = $14, vienphiid = $15, medicalrecordid = $16, sothutuphongkhamid = $17, 
      maubenhphamid = $18, servicepriceid = $19, logeventcontentdetail = $20, 
      sync_flag = $21, update_flag = $22, bedrefid = $23
    WHERE logeventid = $24 RETURNING *`,
    [
      logapp,
      loguser,
      logform,
      softversion,
      logtime,
      ipaddress,
      computername,
      patientid,
      departmentgroupid,
      departmentid,
      logeventtype,
      logeventcontent,
      version,
      hosobenhanid,
      vienphiid,
      medicalrecordid,
      sothutuphongkhamid,
      maubenhphamid,
      servicepriceid,
      logeventcontentdetail,
      sync_flag,
      update_flag,
      bedrefid,
      logeventid,
    ]
  );
  return res.rows[0];
};

const deleteLogEvent = async (logeventid) => {
  const res = await pool.query(
    "DELETE FROM logevent WHERE logeventid = $1 RETURNING *",
    [logeventid]
  );
  return res.rows[0];
};

const partialUpdateLogEvent = async (logeventid, logEventData) => {
  const existingLogEvent = await getLogEventById(logeventid);
  if (!existingLogEvent) {
    throw new Error("LogEvent not found");
  }

  const updatedLogEventData = {
    ...existingLogEvent,
    ...logEventData,
  };

  const {
    logapp,
    loguser,
    logform,
    softversion,
    logtime,
    ipaddress,
    computername,
    patientid,
    departmentgroupid,
    departmentid,
    logeventtype,
    logeventcontent,
    version,
    hosobenhanid,
    vienphiid,
    medicalrecordid,
    sothutuphongkhamid,
    maubenhphamid,
    servicepriceid,
    logeventcontentdetail,
    sync_flag,
    update_flag,
    bedrefid,
  } = updatedLogEventData;

  const res = await pool.query(
    `UPDATE logevent SET
      logapp = $1, loguser = $2, logform = $3, softversion = $4, logtime = $5, ipaddress = $6, computername = $7,
      patientid = $8, departmentgroupid = $9, departmentid = $10, logeventtype = $11, logeventcontent = $12, version = $13,
      hosobenhanid = $14, vienphiid = $15, medicalrecordid = $16, sothutuphongkhamid = $17, maubenhphamid = $18,
      servicepriceid = $19, logeventcontentdetail = $20, sync_flag = $21, update_flag = $22, bedrefid = $23
    WHERE logeventid = $24 RETURNING *`,
    [
      logapp,
      loguser,
      logform,
      softversion,
      logtime,
      ipaddress,
      computername,
      patientid,
      departmentgroupid,
      departmentid,
      logeventtype,
      logeventcontent,
      version,
      hosobenhanid,
      vienphiid,
      medicalrecordid,
      sothutuphongkhamid,
      maubenhphamid,
      servicepriceid,
      logeventcontentdetail,
      sync_flag,
      update_flag,
      bedrefid,
      logeventid,
    ]
  );
  return res.rows[0];
};

module.exports = {
  getAllLogEvents,
  getLogEventById,
  createLogEvent,
  updateLogEvent,
  deleteLogEvent,
  partialUpdateLogEvent,
};
