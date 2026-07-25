import { createSlice } from "@reduxjs/toolkit";
import { getCurrentUser, readCollection, toPlainObject, writeCollection } from "../../utils/localDatabase";

const jobSlice = createSlice({
  name: "jobs",
  initialState: { jobs: [], loading: false, error: null, message: null, singleJob: {}, myJobs: [] },
  reducers: {
    request(state) { state.loading = true; state.error = null; state.message = null; },
    jobsSuccess(state, action) { state.loading = false; state.jobs = action.payload; },
    singleJobSuccess(state, action) { state.loading = false; state.singleJob = action.payload; },
    myJobsSuccess(state, action) { state.loading = false; state.myJobs = action.payload; },
    actionSuccess(state, action) { state.loading = false; state.message = action.payload; },
    failed(state, action) { state.loading = false; state.error = action.payload; },
    clearAllErrors(state) { state.error = null; },
    resetJobSlice(state) { state.error = null; state.message = null; state.loading = false; state.singleJob = {}; },
  },
});

export const fetchJobs = (city, niche, searchKeyword = "") => async (dispatch) => {
  dispatch(jobSlice.actions.request());
  try {
    const keyword = searchKeyword.trim().toLowerCase();
    const jobs = readCollection("jobs").filter((job) => {
      const matchesCity = !city || job.location === city;
      const matchesNiche = !niche || job.jobNiche === niche;
      const searchable = `${job.title} ${job.companyName} ${job.location} ${job.jobNiche}`.toLowerCase();
      return matchesCity && matchesNiche && (!keyword || searchable.includes(keyword));
    });
    dispatch(jobSlice.actions.jobsSuccess(jobs));
  } catch (error) { dispatch(jobSlice.actions.failed(error.message)); }
};

export const fetchSingleJob = (jobId) => async (dispatch) => {
  dispatch(jobSlice.actions.request());
  const job = readCollection("jobs").find((item) => item._id === jobId);
  if (job) dispatch(jobSlice.actions.singleJobSuccess(job));
  else dispatch(jobSlice.actions.failed("Job not found."));
};

export const postJob = (data) => async (dispatch) => {
  dispatch(jobSlice.actions.request());
  try {
    const user = getCurrentUser();
    if (!user || user.role !== "EMPLOYER") throw new Error("Only employers can post jobs.");
    const form = toPlainObject(data);
    if (!form.title || !form.location || !form.companyName || !form.jobNiche || !form.salary) {
      throw new Error("Please complete all required job fields.");
    }
    const jobs = readCollection("jobs");
    const newJob = {
      _id: `job-${Date.now()}`,
      employerId: user.id,
      title: form.title,
      jobType: form.jobType || "Full-time",
      location: form.location,
      companyName: form.companyName,
      introduction: form.introduction || "",
      responsibilities: form.responsibilities || "",
      qualifications: form.qualifications || "",
      offers: form.offers || "",
      jobNiche: form.jobNiche,
      salary: form.salary,
      hiringMultipleCandidates: form.hiringMultipleCandidates || "No",
      personalWebsite: form.personalWebsiteUrl ? { title: form.personalWebsiteTitle || "Website", url: form.personalWebsiteUrl } : null,
      jobPostedOn: new Date().toISOString(),
    };
    writeCollection("jobs", [newJob, ...jobs]);
    dispatch(jobSlice.actions.actionSuccess("Job posted successfully."));
  } catch (error) { dispatch(jobSlice.actions.failed(error.message)); }
};

export const getMyJobs = () => async (dispatch) => {
  dispatch(jobSlice.actions.request());
  const user = getCurrentUser();
  const jobs = readCollection("jobs").filter((job) => job.employerId === user?.id);
  dispatch(jobSlice.actions.myJobsSuccess(jobs));
};

export const deleteJob = (id) => async (dispatch) => {
  dispatch(jobSlice.actions.request());
  const user = getCurrentUser();
  const jobs = readCollection("jobs");
  const target = jobs.find((job) => job._id === id);
  if (!target || target.employerId !== user?.id) return dispatch(jobSlice.actions.failed("Job not found or unauthorized."));
  writeCollection("jobs", jobs.filter((job) => job._id !== id));
  writeCollection("applications", readCollection("applications").filter((app) => app.jobId !== id));
  dispatch(jobSlice.actions.actionSuccess("Job deleted successfully."));
};

export const clearAllJobErrors = () => (dispatch) => dispatch(jobSlice.actions.clearAllErrors());
export const resetJobSlice = () => (dispatch) => dispatch(jobSlice.actions.resetJobSlice());
export default jobSlice.reducer;
