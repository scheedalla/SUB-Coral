/*
This is the Embed Javascript v 0.0.5 for the Sub Platform embedded form
Dependencies: jQuery
Author: it.sub@washpost.com

Notes: Google Recaptcha has been minified to be included in embed.min.js. It lives here: src="/javascripts/vendors/google-recaptcha/api.js". If at any time, the callback function name has to change, then it must be re-rendered via the Google API and saved locally: src="https://www.google.com/recaptcha/api.js?onload=subCaptchaCallback&render=explicit"

Sample embed HTML snippet
		<div class="sub">
	        <form id="form_{{app._id}}" role="form" action="" novalidate>
	        </form>
        </div>
        <script>
        $(function() {
          SubmissionPlatform.services.displayForm("{{app._id}}", "local");   //you have to set the correct env variable: local, dev, qa, stage, prod
        });
        </script>
        <script src="//localhost:3000/javascripts/embed/0.0.5/embed.min.js"></script>

*/
//had to put the captcha callback outside of the Sub scope because the Google API didn't like the dot operator.
var subCaptchaCallback=function(){
	var subWidgets={};
	$('.sub-captcha').each(function(i, obj){
	var formId = this.id.split('_');
		subWidgets[this.id]= grecaptcha.render(this.id, {
			'sitekey':'6Ld_EAQTAAAAAEP3OAsStvby187x6vTFniNYM8qD',
			'callback':function(resp){
				$('#captcha_resp_'+formId[1]).val(resp);
			}
		});
	});
};

var SubmissionPlatform = window.SubmissionPlatform || {};
SubmissionPlatform.services = {
	//global static variables
	getFormUrl:"/app.jsonp?callback=?",
	submitUrl:"submission",
	updateUrl:"updateSub",
	//main display form function that is embedded
	displayForm:function(appId, env){
		//defined variables to be used throughout SubmissionPlatform.services.displayForm(appId, env)
		var $form = $("#form_"+appId);
		var subEnv = SubmissionPlatform.services.getPupBase(env);
		var subId = "";

		//date variables used when creating the date, pastDate, and futureDate fields
		var thisDate = new Date();
		var thisYear = thisDate.getFullYear();
		var thisMonth = thisDate.getMonth();
		var thisDay = thisDate.getDate();
		var months = ['Jan','Feb','Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct','Nov','Dec'];
		var numMonth = 1, numArrayMonth = 0, numYear = 1950, days = 31, numDay = 1, futureYear = thisDate.getFullYear(), selectedDay = 1;
		var monthsLength = months.length;

		//API request to get the form information to display
		$.getJSON(subEnv + appId + SubmissionPlatform.services.getFormUrl, function(data){
			var formName = (data.applicationInfo.appName)?data.applicationInfo.appName:$form.prepend("<h3>This form does not exist.</h3>");;
			var inactiveMessage = data.applicationInfo.inactiveMessage;

			//if the form is inactive
			if(!data.applicationInfo.active){
	        $form.prepend("<h1>"+ formName + "</h1>"+"<h3>" + inactiveMessage + "</h3>");
	      	}
	      	//if the form is active
	      	else{
	      		if(SubmissionPlatform.services.isIE() && SubmissionPlatform.services.isIE()<10){
        		$form.prepend("<h2>Unfortunately, this form is not supported in this browser. Please <a href='http://browsehappy.com/''>upgrade your browser</a> to improve your experience!</h2>");
      			}

	      		var formDesc = (data.applicationInfo.appDescription)?data.applicationInfo.appDescription:"",
	      		callToAction = data.applicationInfo.callToAction,
		      	confirmation = data.applicationInfo.confirmation,
		      	autoApproved = data.applicationInfo.autoApproved,
		      	customerId = data.applicationInfo.customerId,
		      	accountId = data.applicationInfo.accountId,

		      	formData = data.applicationInfo.appFormFields;
		      	hasCaptcha = data.applicationInfo.hasCaptcha;

		      	//default error message, initially hidden
		      	$form.prepend("<div class='sub_formErrors sub_reqText' style='display:none;' id='sub_formErrors_"+appId+"'>Oops! There is a problem with the form, please check and correct below.</div>");

		      	//appending name, description, and hidden values needed
		      	$form.append( "<h1>"+ formName + "</h1>" + "<h2>"+ formDesc + "</h2>" + "<h5 class='sub_reqText'>*Required</h5><input class='sub_appInfo' type='hidden' name='appId.appInfo' value='"+appId+"'>" + "<input class='sub_appInfo' type='hidden' name='applicationName.appInfo' value='"+formName+"'>" + "<input class='sub_appInfo' type='hidden' name='approved.appInfo' value='"+autoApproved+"'>" + "<input class='appInfo' type='hidden' name='customerId.appInfo' value='"+customerId+"'>" + "<input class='appInfo' type='hidden' name='accountId.appInfo' value='"+accountId+"'><input type='hidden' id='subId_"+appId+"' name='subId' value=''>");


		      //iterate through each form field in form data
		      $.each(formData, function(key,value){
		      	var fieldName = this.fieldName,
        			uniqueId = this.uniqueId,
        			type = this.fieldType,
			        mediaSetId = this.mediaSetId,
			        value = this.fieldType,
			        min = this.min,
			        max = this.max,
			        description = this.description,
			        placeholder = (this.placeholder != null)?this.placeholder:"",
			        req = (this.isMandatory)?"<span class='sub_reqText'>*</span>":"",
			        reqClass = (this.isMandatory)?"sub_required":"",
			        publicField = this.isPublic,
			        options;

			        //if not public field
			        if (!publicField){
			          $form.append("<input type='hidden'class='sub_"+type+"'name='"+uniqueId+"'><br></input>");
			        }
			        //if public field
			        else {

			        	//field name/question
				        if(type =='sectionHeader') $form.append("<h3 class='sub_section-header'>" + fieldName +"</h3>");
								else if(type =='subSectionHeader') $form.append("<h4 class='sub_sub-section-header'>" + fieldName +"</h3>");
				        else $form.append("<h4 class='sub_name "+uniqueId+"'>"+ fieldName +req + " <label id='error_"+uniqueId+"' class='sub_reqText sub_errorMsg' style='display:none;'></label></h4>");

				       //helper text
				        if(this.description != null){
				          $form.append("<h5 class='sub_desc'>"+ description + "</h5>");
				        }

				        else{
				          //do nothing
				        }

				        //check all input types
					      if(type == 'radio') {
					        options = this.fieldTypeOptions.split(',');
					        $.each(options,function(key,value){
					          $form.append("<input type='"+type+"'class='"+reqClass+" sub_"+type+" 'name='"+uniqueId+"' value='"+$.trim(value)+"' id='"+value+uniqueId+"'><label for='"+value+uniqueId+"'  class='radio'>"+ $.trim(value) +"</label><br>");
					            // if (type=="radio" && key == 0){
					            //   $('#'+value+uniqueId).prop('checked', true);
					            // };
					          });
					      }
					      else if(type == 'checkbox') {
					        options = this.fieldTypeOptions.split(',');
					        $.each(options,function(key,value){
					          $form.append("<input type='"+type+"'class='"+reqClass+" sub_"+type+" 'name='"+uniqueId+".array' value='"+$.trim(value)+"' id='"+value+uniqueId+"'><label for='"+value+uniqueId+"' class='checkbox'>"+ $.trim(value) +"</label><br>");
					            // if (type=="radio" && key == 0){
					            //   $('#'+value+uniqueId).prop('checked', true);
					            // };
					          });
					      }
					      else if(type == 'dropdown'){
					        var dropdownHTML = " <select name='"+uniqueId+"' class='"+reqClass+"' id='id"+uniqueId+"'>";

					        options = this.fieldTypeOptions.split(',');
					        $.each(options,function(key,value){
					          dropdownHTML = dropdownHTML + "<option value='"+$.trim(value)+"'>"+ $.trim(value)+"</option>";

					        });
					        dropdownHTML = dropdownHTML + "</select>";

					        $form.append(dropdownHTML);
					      }
					      else if (type == 'trueFalse'){
					        $form.append("<input type='radio' class='"+reqClass+" sub_"+type+"'name='"+uniqueId+"' value='true' id='true"+uniqueId+"'><label  for='true"+uniqueId+"' >True</label><br>"+
					          "<input type='radio' class='"+reqClass+" sub_"+type+"'name='"+uniqueId+"' value='false' id='false"+uniqueId+"' ><label  for='false"+uniqueId+"' class='radio'>False</label><br>");
					      }
					      else if (type == 'yesNo'){
					        $form.append("<input type='radio' class='"+reqClass+" sub_"+type+"'name='"+uniqueId+"' value='yes' id='yes"+uniqueId+"' ><label  for='yes"+uniqueId+"' >Yes</label><br>"+
					          "<input type='radio' class='"+reqClass+" sub_"+type+"'name='"+uniqueId+"' value='no' id='no"+uniqueId+"' ><label  for='no"+uniqueId+"'  class='radio'>No</label><br>");
					      }
					      else if (type == 'textarea')  {
					        var charLimit = (this.textareaCharLimit)? this.textareaCharLimit:"";
					        $form.append("<textarea name='"+uniqueId+"' placeholder='"+placeholder+"' class='"+reqClass+"'  id='"+uniqueId+"' value='' maxlength='"+charLimit+"'></textarea><br>");
					      }
					      else if (type == 'sectionHeader' || type == 'subSectionHeader') {
					          //dont add any inputs


					      }
					      else if(type == 'number'){
					          $form.append("<div><input type='number'class='"+reqClass+" sub_number 'name='"+uniqueId+"' id='"+uniqueId+"' value='' min='"+min+"' max='"+max+"'></input></div> ");

					        }
					        else if (type == 'firstAndLastName'){
					            $form.append("<div style='float:left;margin-right: 5px;' class='first "+uniqueId+"'><input type='text'class='"+reqClass+" sub_"+type+" sub_text 'name='"+uniqueId+"_first.nameComponent' id='"+uniqueId+"_first' value=''></input><br><span class='firstNameLabel'>First</span></div><div style='float:left;' class='last "+uniqueId+"'><input type='text'class='"+reqClass+" sub_"+type+" sub_text 'name='"+uniqueId+"_last.nameComponent' id='"+uniqueId+"_last' value=''></input><br><span class='lastNameLabel'>Last</span></div><input type='hidden'class='"+reqClass+" sub_"+type+" sub_text 'name='"+uniqueId+"' placeholder='First' id='"+uniqueId+"' value=''></input><br><br><br>");


					            /*************START: FIRST AND LAST NAME EVENTS ******************/
								function bindNameEvents(name,type){
								    $("#"+name+"_first, #"+name+"_last").on("change", function(event){
								            var firstName = ($("#"+name+"_first").val())?$("#"+name+"_first").val():"";
								            var lastName = ($("#"+name+"_last").val())?" "+$("#"+name+"_last").val():"";
								            $("#"+name).val(firstName + lastName);

								        });
								}
								bindNameEvents(uniqueId, type);
								/*************END: FIRST AND LAST NAME EVENTS ******************/
					        }
					        else if(type == 'phoneNumber'){
					          $form.append("<div style='float:left;' class='areacode'><input type='number'class='"+reqClass+" sub_number 'name='"+uniqueId+"_areacode.phNumComponent' id='"+uniqueId+"_areacode' value='' min='0' style='' max='999' maxlength='3'></input><br>###</div><div style='float:left;' class='dash'>&#8212;</div><div style='float:left;' class='prefix'><input type='number'class='"+reqClass+" sub_number 'name='"+uniqueId+"_prefix.phNumComponent' id='"+uniqueId+"_prefix' value='' min='0' style='' max='999' maxlength='3'></input><br>###</div><div style='float:left;' class='dash'>&#8212;</div><div style='float:left;' class='linenum'><input type='number' class='"+reqClass+" sub_number 'name='"+uniqueId+"_linenum.phNumComponent' id='"+uniqueId+"_linenum' value='' min='0' style='' maxlength='4'></input><br>####</div><input type='hidden'class='"+reqClass+" sub_phnum 'name='"+uniqueId+"' id='"+uniqueId+"' value=''></input><br><br><br>");


					          /*************START: PHONE NUMBER EVENTS ******************/
								function bindPhNumEvents(name,type){
								    $("#"+name+"_areacode, #"+name+"_prefix, #"+name+"_linenum").on("change", function(event){
								            var areacode = ($("#"+name+"_areacode").val())?$("#"+name+"_areacode").val():"";
								            var prefix = ($("#"+name+"_prefix").val())?$("#"+name+"_prefix").val():"";
								            var linenum = ($("#"+name+"_linenum").val())?$("#"+name+"_linenum").val():"";
								            $("#"+name).val(areacode + "-" + prefix + "-"+ linenum);
								        });

								    $("#"+name+"_areacode").on("keyup", function(event){
								                if($(this).val().length == $(this).attr("maxlength")){
								                  $("#"+name+"_prefix").focus();
								                }
								        });


								    $("#"+name+"_prefix").on("keyup", function(event){
								                if($(this).val().length == $(this).attr("maxlength")){
								                  $("#"+name+"_linenum").focus();
								                }
								        });
								}
								bindPhNumEvents(uniqueId, type);
								/*************END: FIRST PHONE NUMBER EVENTS ******************/
					        }
					        else if(type=='time'){
					           $form.append("<div><input type='number'class='"+reqClass+"time_hours sub_number 'name='"+uniqueId+"_hours.timeComponent' id='"+uniqueId+"_hours' value='' min='1' max='12'></input> : <input type='number'class='"+reqClass+" time_mins sub_number 'name='"+uniqueId+"_mins.timeComponent' id='"+uniqueId+"_mins' value='' min='0' max='60'></input>  <select name='"+uniqueId+"_ampm.timeComponent' id='"+uniqueId+"_ampm' class='time_ampm'><option value='AM' selected>AM</option><option value='PM'>PM</option></select><input type='hidden'class='' name='"+uniqueId+"' id='"+uniqueId+"' value=''></input></div>");


								/*************START: TIME EVENTS ******************/
								function bindTimeEvents(name, type){
								  $("#"+name+"_hours, #"+name+"_mins, #"+name+"_ampm").on("change", function(event){
								    var hours = ($("#"+name+"_hours").val())?$("#"+name+"_hours").val():"00";
								    var mins = ($("#"+name+"_mins").val())?$("#"+name+"_mins").val():"00";
								    var ampm = ($("#"+name+"_ampm").val())?$("#"+name+"_ampm").val():"";

								    $("#"+name).val(hours + ":" + mins + " "+ ampm);
								  });
								}
								bindTimeEvents(uniqueId, type);
								/*************END: TIME EVENTS ******************/
					        }
					        //Media Set Button Text
					      else if (type == 'mediaSet'||type == 'mediaSetDoc'||type == 'mediaSetVid'||type == 'mediaSetAudio'){
					      	var attachText;
					      	if(type == 'mediaSet'){attachText="Photo(s)";}
					      	else if(type == 'mediaSetDoc'){attachText="Document";}
					      	else if(type == 'mediaSetVid'){attachText="Video";}
					      	else if(type == 'mediaSetAudio'){attachText="Audio File";}


					      	$form.append( "<button onclick=\"SubmissionPlatform.services.createMediasetModal('"+env+"','"+appId+"',"+this.mediaSetId+")\" type='button'>Attach "+attachText+"</button><label id='errorfileUpload_"+appId+"_"+this.mediaSetId+"' class='sub_reqText errorMsg' style='display:none;'></label><br><br>"+
					            "<div id='modal_"+appId+"_"+this.mediaSetId+"' style='display:none;position: fixed;top: 0;right: 0;bottom: 0;left: 0;z-index: 6036870903;;background: rgba(0, 0, 0, 0.8);'><div style='width:75%;background-color: white;position: relative;margin: 10px auto;overflow:auto;'><a style='font-size: 1.375em;line-height: 1;position: absolute;top: 0.5em;right: 0.6875em;color: #aaaaaa;font-weight: bold;cursor: pointer;text-decoration: none;cursor:pointer;' id='modalClose_"+appId+"_"+this.mediaSetId+"'>x</a><br><br><iframe style='width: 99%;height: 500px;border: none;'></iframe></div></div>")

					          $form.append("<input type='hidden' id='numFilesUploaded_"+appId+"_"+this.mediaSetId+"' value='0'><input type='hidden' class='"+reqClass+"' name='uniqueUploadId.mediaset" + this.mediaSetId + "' value='"+SubmissionPlatform.services.createUpId()+"' id='uniqueUploadId_"+appId+"_"+this.mediaSetId+"'>"+
					          	"<input type='hidden' name='transfered.mediaset" + this.mediaSetId + "' value='false' id='transferred_"+appId+"_"+this.mediaSetId+"'>"+"<input type='hidden' name='mediasetId.mediaset" + this.mediaSetId + "' value='"+mediaSetId+"' id='mediasetId_"+appId+"_"+this.mediaSetId+"'>"+"<div id='uploadedPhoto_"+appId+"_" + this.mediaSetId + "' style='display:none'></div>");
					      }//end mediasets
					      else if (type == 'date' || type == 'pastDate' || type == 'futureDate'){

				          //set the months dropdown
				          var monthsHTML = "<select name='months"+uniqueId+".dateComponent' class='dd-months "+reqClass+" "+"months"+uniqueId+"'>";
				          if(type == 'futureDate'){
				            numArrayMonth = thisMonth;
				          }
				          else{
				          	numArrayMonth = 0;
				          }
				          for (var i = numArrayMonth;i<monthsLength;i++){
				            monthsHTML = monthsHTML + "<option value='"+ (i + 1)  +"'>"+months[i]+"</option>";
				          }
				          monthsHTML = monthsHTML + "</select>";

				          //set the days dropdown
				          if(type == 'futureDate'){
				              numDay = thisDay;
				          }
				          else{
				          	numDay = 1;
				          }
				          var daysHTML = "<select name='days"+uniqueId+".dateComponent' class='dd-days "+reqClass+" "+"days"+uniqueId+"'>";
				          for (var i = numDay;i<=days;i++){
				            daysHTML = daysHTML + "<option value='"+ i +"'>"+i+"</option>";
				          }
				          daysHTML = daysHTML + "</select>";


				          //set the years dropdown
				          var yearsHTML = "<select name='years"+uniqueId+".dateComponent' class='dd-years "+reqClass+" "+"years"+uniqueId+"'>";
				          if (type =='futureDate'){
				              numYear = thisYear;
				              futureYear = thisYear + 10;
				          }
				          else{
				          	numYear = 1950;
				          	futureYear = thisYear;
				          }
				          for (var i = numYear;i<=futureYear;i++){
				            yearsHTML = yearsHTML + "<option value='"+ i +"'>"+i+"</option>";
				          }
				          yearsHTML = yearsHTML + "</select>";
				          $form.append(monthsHTML + daysHTML + yearsHTML + "<input type='hidden' name='"+uniqueId+"' class='date"+uniqueId+"' value='"+numYear+"-"+numMonth+"-"+numDay+"'><br>");


				          function bindCalendarEvents(name, type){

					        $(".months"+name).on("change", function(event){
					            numMonth = $(this).val();
					            selectedDay = $(".days"+name).val();
					          DaysInMonth(numYear,numMonth,name,type);
					          fillDate(name);
					        });


					        $(".years"+name).on("change", function(event){
					          numYear = $(this).val();
					          // console.log("numMonth: "+numMonth);
					          // console.log("thisMonth: "+thisMonth);
					          // console.log("numMonth val: "+$(".months"+name).val());
					          selectedMonth = $(".months"+name).val();
					          selectedDay = $(".days"+name).val();

					        if(type == 'pastDate' && numYear == thisYear){
					            monthsLength = thisMonth+1;
					          }
					          else{
					            monthsLength = months.length;
					          }
					          $(".months"+name).empty();
					            for (var i = 0;i<monthsLength;i++){
					              $(".months"+name).append("<option value='"+ (i + 1) +"'>"+months[i]+"</option>");
					            }

					          $(".months"+name).val(selectedMonth);
					          DaysInMonth(numYear,numMonth,name,type,selectedDay);
					          fillDate(name);
					        });

					        $(".days"+name).on("change", function(event){
					          fillDate(name);
					        });

					      }
					      bindCalendarEvents(uniqueId, type);
					      //function to correctly fill each dropdown based on what is selected
					      function DaysInMonth(numYear,numMonth,name,type,selectedDay) {
					        $(".days"+name).empty();
					        var totalMonthDays = new Date(numYear,numMonth,0).getDate();
					        var startDay = 1;

					        if(type == 'pastDate' && numYear == thisYear && numMonth == (thisMonth + 1)){
					              days = thisDate.getDate();
					        }
					        else if (type == 'futureDate' && numYear == thisYear && numMonth == (thisMonth+1)){
					              startDay = thisDate.getDate();
					              days = totalMonthDays;
					        }
					        else{
					          days = totalMonthDays;
					        }

					        for(var i = startDay; i<=days;i++){
					          $(".days"+name).append("<option value='"+ i +"'>"+i+"</option>");
					        }
					        if(selectedDay){
					        	$(".days"+name).val(selectedDay);
					        }
					        else{
					        	$(".days"+name).val(1);
					        }

					      }

					      function fillDate(name){
					        var m = $(".months"+name).val(),
					        d = $(".days"+name).val(),
					        y = $(".years"+name).val();
					        $(".date"+name).val(y + '-' + m + '-' + d);
					      }




				        }//end date type
				        else if (type == 'address'){


				          var usStatesHTML="<select name='"+uniqueId+"_usState.addressComponent' class='"+reqClass+" usStates' id='"+uniqueId+"_usState'>",
				         countriesHTML="<select name='"+uniqueId+"_country.addressComponent' class='"+reqClass+"' id='"+uniqueId+"_country'>";
				         var statesOptionHTML = "", countriesOptionHTML;

				         	for(var s=0; s<SubmissionPlatform.services.usStates.length;s++){
				         		var state = SubmissionPlatform.services.usStates[s];
				         		statesOptionHTML = statesOptionHTML + "<option value='"+state.abbreviation+"'>"+state.name+"</option>";
				         	}
				         	usStatesHTML = usStatesHTML + statesOptionHTML + "</select>";


				          //countries select box
				          for(var c=0; c<SubmissionPlatform.services.usStates.length;c++){
				          	var country = SubmissionPlatform.services.countries[c];
				          	countriesOptionHTML = countriesOptionHTML + "<option value='"+country.name+"'>"+country.name+"</option>";
				          }
				          countriesHTML = countriesHTML + countriesOptionHTML + "</select>";


				          $form.append("<div><input type='text'class='"+reqClass+" sub_text 'name='"+uniqueId+"_address1.addressComponent' id='"+uniqueId+"_address1' value=''></input><br>Street Address<br><input type='text'class='sub_text 'name='"+uniqueId+"_address2.addressComponent' id='"+uniqueId+"_address2' value=''></input><br>Address Line 2<br><div style='float:left;'><input type='text'class=' sub_text 'name='"+uniqueId+"_city.addressComponent' id='"+uniqueId+"_city' value=''></input><br>City</div><div style='float:left;'>"+usStatesHTML+"<input type='text'class='sub_text 'name='"+uniqueId+"_state.addressComponent' id='"+uniqueId+"_state' value='' style='display:none;'></input>State</div><div style='clear:both;'></div><div style='float:left;'><input type='text'class=' sub_text 'name='"+uniqueId+"_postalcode.addressComponent' id='"+uniqueId+"_postalcode' value=''></input><br>Postal Code</div><div style='float:left;'>"+countriesHTML+"Country</div></div><input type='hidden'class='"+reqClass+" sub_text 'name='"+uniqueId+"' id='"+uniqueId+"' value=''></input><br><br><br>");



				          /*************START: ADDRESS EVENTS ******************/
							function bindAddressEvents(name,type){
							      $("#"+name+"_address1, #"+name+"_address2,#"+name+"_city, #"+name+"_state, #"+name+"_state, #"+name+"_usState, #"+name+"_postalcode, #"+name+"_country").on("change", function(event){
							            var address1 = ($("#"+name+"_address1").val())?$("#"+name+"_address1").val():"";
							            var address2 = ($("#"+name+"_address2").val())?$("#"+name+"_address2").val():"";
							            var city = ($("#"+name+"_city").val())?$("#"+name+"_city").val():"";
							            var state;
							            var postalcode = ($("#"+name+"_postalcode").val())?$("#"+name+"_postalcode").val():"";
							            var country = ($("#"+name+"_country").val())?$("#"+name+"_country").val():"";
							            if(country == 'United States'){
							              $("#"+name+"_state").hide();
							              $("#"+name+"_usState").show();
							              state = ($("#"+name+"_usState").val())?$("#"+name+"_usState").val():"";
							            }
							            else{
							              $("#"+name+"_state").show();
							              $("#"+name+"_usState").hide();
							              state = ($("#"+name+"_state").val())?$("#"+name+"_state").val():"";
							            }
							            $("#"+name).val(address1 + ", " + address2 +", "+ city+ ", "+state+ ", "+postalcode+ ", "+country);
							        });

							}
							bindAddressEvents(uniqueId, type);
							 /*************END: ADDRESS EVENTS ******************/
        }//end address type
        else {$form.append("<input type='"+type+"'class='"+reqClass+" sub_"+type+" 'name='"+uniqueId+"' placeholder='"+placeholder+"' id='"+uniqueId+"' value=''></input>"); }
			        }//end looking at all the public fields
		      });//end iteration through each form field in form data


		if(hasCaptcha){
			$form.append('<br><br><div id="captcha_error_'+appId+'" class="sub_reqText sub_errorMsg"></div><div id="captcha_'+appId+'" class="sub-captcha"></div><input type="hidden" id="captcha_resp_'+appId+'"><input type="hidden" id="hasCaptcha_'+appId+'" value="'+hasCaptcha+'">');
		}
		else if(!hasCaptcha){
			$form.append('<input type="hidden" id="hasCaptcha_'+appId+'" value="'+hasCaptcha+'">');
		}

		$form.append( "<br><br><button type='submit'>"+callToAction+"</button>");
		$form.parent().append( "<h5 class='sub_confirm' style='display:none;' id='confirm_"+appId+"'>"+confirmation+"</h5>");

	      	}//end else for active form
		})//end getJSON


     // process the form submission
      $form.submit(function(event) {

        event.preventDefault();
        //validate the form
        var hasErrors = SubmissionPlatform.services.validateForm(appId); //validate the form
        if (hasErrors){
         $("#sub_formErrors_"+appId).fadeIn();
         return false;
       }

       event.preventDefault();
       var createdArray = SubmissionPlatform.services.reformatArray($(this));
       createdArray.submitted = true;
       createdArray.createdDate = new Date();
      var subId = $("#subId_"+appId).val();

       var submitTo = subEnv+SubmissionPlatform.services.submitUrl;
       if(subId != ""){
          submitTo = subEnv+SubmissionPlatform.services.updateUrl;
          createdArray._id = subId;
       }

        // post the form
        $.ajax({
          type    : 'POST',
          url     : submitTo,
          data: JSON.stringify(createdArray),

          contentType: "application/json; charset=utf-8",
          dataType: "json",
          success   : function(data) {
          // log data to the console so we can see

            // if fails when compared against
            if (data.durr) {
             $form.hide();
             $form.parent().append( "<h5>Your request failed.</h5>");
             $form.parent().append( "<h5>Error:</h5>");
             var errorContent = data.durr.message +"<br>";
             errorContent = errorContent + data.durr.name +"<br>";
             var errors = data.durr.errors;
             for (var key in errors){
              var error = errors[key];
              for (var prop in error){
                if(error.hasOwnProperty(prop)){
                  errorContent = errorContent + prop + " = " + error[prop] + "<br>";
                }
              }
            }
            $form.parent().append( "<div>"+errorContent+"</div>");
          } else {
              // if validation is good add success message
              $form.hide();
              $("#confirm_"+appId).show();
              // The Submission Object
              submissionInfo = data;
              // The Submission ID

              subId = data.submissionInfo._id;

              // endUserCallBack(submissionInfo, subId, mediaSetIds, imageOne);
            }
          }
        })
.fail(function(){
  window.console && console.log('validation failed');
});
});




	},
	createMediasetModal:function(env,appId, msnum){
		var env = SubmissionPlatform.services.getPupBase(env);
		var msId = $("#mediasetId_"+appId+"_"+msnum).val();
        var uuId = $("#uniqueUploadId_"+appId+"_"+msnum).val();
        var subId = $("#subId_"+appId).val();


                    window.closeModal = function(){
                          $("#modal_"+appId+"_"+msnum).hide();
                          // console.log('close');
                          pollForPhoto(msnum,appId,uuId,subId);
                        }
                    var form = $("#form_"+appId);
                    var initializedArray = SubmissionPlatform.services.reformatArray(form);
                    var context = "/pup";

                    if(!subId){
                      $.ajax({
                        type    : 'POST',
                        url     : env + SubmissionPlatform.services.submitUrl,
                        data: JSON.stringify(initializedArray),

                        contentType: "application/json; charset=utf-8",
                        dataType: "json",
                        success   : function(data) {
                          if (data.durr) {
                            //error initializing submission
                            console.log(data.durr);
                          } else {
                            // submission initialized
                            // console.log(data);
                            subId = data.submissionInfo._id;
                            $("#subId_"+appId).val(subId);
                            mediasetHref = env + appId + "/" + msId + "/" + uuId + "/" + subId + context;
                            openMediasetModal(mediasetHref,msnum);
                          }
                        }
                      })
                      .fail(function(){
                        window.console && console.log('failed to initialize submission');
                      });
                    } else {



                            mediasetHref = env + appId + "/" + msId + "/" + uuId + "/" + subId + context;
                            openMediasetModal(mediasetHref,msnum);


                    }

                    function openMediasetModal(mediasetHref,msnum){
				        // pollForPhoto(msnum,appId,uuId,subId);
				        $("#modal_"+appId+"_"+msnum+" iframe").css('height', document.documentElement.clientHeight - 80).attr('src',mediasetHref);
				        $("#modal_"+appId+"_"+msnum).show();

				        // console.log('$(document).height= ', $(document).height());
				        // console.log('$(document).width= ', $(document).width());
				        // console.log('document.documentElement.clientHeight= ', document.documentElement.clientHeight);
				        // console.log('document.documentElement.clientWidth= ', document.documentElement.clientWidth);

				        $("#modalClose_"+appId+"_"+msnum).on( "click", function() {
				          closeModal(msnum);
				      });
				    }


				     function pollForPhoto(msid,appId,upid,subid){
			        	$.getJSON(env+subId+"/"+msId+"/mediaset.jsonp?callback=?", function(data){
			        		// console.log('is media an array?', $.isArray(data[0].mediasets[0].media));
			        		var media = data[0].mediasets[0].media;
			        		// console.log(media);
			        		var fileHTML ="";

			        		//show default no photo found message//
					        $("#uploadedPhoto_"+appId+"_" + msnum)
					            .html("No file(s) were uploaded.")
					            .show();

					        for(var i=0;i<media.length;i++){
					        	if(media[i].hasOwnProperty('mediaUrlThumb')){
					        		fileHTML +="<li><img class='photo-preview' src='"+media[i].mediaUrlThumb+"'></li>"
					        	}
					        	else{
					        		fileHTML +="<li>"+media[i].originalName+": <a href='"+media[i].mediaUrl +"' target='_blank'>http:"+media[i].mediaUrl+"</a></li>";
					        	}

					        }
					        $("#uploadedPhoto_"+appId+"_" + msnum).html("<ul style='list-style-type:none;'>" + fileHTML + "</ul>").show();

					         $("#numFilesUploaded_"+appId+"_"+msnum).val(media.length);


			        	});

			      }


	},
	reformatArray:function(data){
     var cleanArray = data.serializeArray();
        var name = "";
        var formDataArray={};
        //prepare array for Json
        var value, obj, newArray = {
                                "formData":formDataArray,
                                "mediasets":[{}]

                                };


        var dataNum = 0;
        for (var i=0; i < cleanArray.length; i++){
          obj = cleanArray[i];
          name = obj['name'];
          name = name.replace(/\+/g, ' ');
          value = obj['value'];
          if(name.indexOf(".appInfo") > -1){
            name = name.slice(0,name.indexOf(".appInfo"));
            newArray[name]=value;
          }
          else if(name.indexOf("subId")>-1){
          	//ignore this
          }
          else if(name.indexOf(".mediaset") > -1){
            currentMediaset = name.slice(name.indexOf(".mediaset") + 9);
            name = name.slice(0,name.indexOf(".mediaset"));
            if(!newArray.mediasets[currentMediaset]) {
              newArray.mediasets.push({});
            }
            newArray.mediasets[currentMediaset][name]=value;

          }
          else if(name.indexOf(".dateComponent") > -1 || name.indexOf(".nameComponent") > -1|| name.indexOf(".phNumComponent") > -1 || name.indexOf(".addressComponent") > -1 || name.indexOf(".timeComponent") > -1){
            //do nothing. Don't include date, name, or phone number components in newArray
          }
          else if(name.indexOf(".array") > -1){
            //store checkboxes and tags in arrays
            name = name.slice(0,name.indexOf(".array"));
            var exists = false;
              if(newArray.formData[name] != null){
                if(newArray.formData[name] == ""){
                  newArray.formData[name] = {};
                }
                newArray.formData[name][value] = true;
                exists = true;
              }

            if(!exists){
              newArray.formData[name] = {};
              newArray.formData[name][value] = true;

            }
          }

          else {
            newArray.formData[name]=value;

          }

      }
      return newArray;
  },
  validateForm:function(appId){
  /*************START: FORM VALIDATION ******************/

        var errors = false;

        $('#form_'+appId+' *').filter(':input').each(function(){

          var type = $(this).attr("type");
          var name = $(this).attr("name");
          var id = $(this).attr("id");
          var val = this.value;



          if($(this).hasClass('sub_required')){

            if(type == "number" || $(this).hasClass('sub_number')){
              if(!$.isNumeric(val)){
                $("#error_"+id).fadeIn().html("This is not a number.");
                errors = true;
              }
              else{
                var minNum = ($(this).attr("min") && $(this).attr("min") != "undefined")?parseInt($(this).attr("min")):"";
                var maxNum = ($(this).attr("max") && $(this).attr("max") != "undefined")?parseInt($(this).attr("max")):"";

                if((minNum != "" && val < minNum)||(maxNum != "" && val > maxNum)){
                  if(name.indexOf('timeComponent')>-1){
                    var tmp = id.split("_");
                    var last = tmp[tmp.length - 1];
                    var tmpid = id.replace("_"+last,"");
                    $("#error_"+tmpid).fadeIn().html("Please check the time you entered.");

                  }
                  else{
                    $("#error_"+id).fadeIn().html("Number must be between "+minNum+" and "+maxNum+".");
                  }

                  errors = true;
                }
                else{
                  $("#error_"+id).fadeIn().html("");
                }


              }
            }
            //missing photos
            else if(name.indexOf("uniqueUploadId") > -1){
            	var fileId = id.split("_");
            	var fileMsId = fileId[2];
            	var numFilesUploaded = $("#numFilesUploaded_"+appId+"_"+fileMsId).val();
            	if(numFilesUploaded == 0){
            		$("#errorfileUpload_"+appId+"_"+fileMsId).fadeIn().html("Please upload your file(s).");
            		errors = true;
            	}
            	else{
            		$("#errorfileUpload_"+appId+"_"+fileMsId).fadeIn().html("");
            	}

            }

            else if (type == "checkbox" || type == "radio"){
                //do nothing, has diff validation
            }

            else if(val == ""){
                $("#error_"+id).fadeIn().html("This field is required.");

              errors = true;
            }

            else if(type == "email" || $(this).hasClass('sub_email')){
              if(!isValidEmailAddress(val)){
                $("#error_"+id).fadeIn().html("This is not a valid email.");
                errors = true;
              }
              else{
                $("#error_"+id).fadeIn().html("");
              }
            }
            else if($(this).hasClass('sub_phnum') && (val.length > 12 || val.length < 12)){
            	$("#error_"+id).fadeIn().html("Please enter a valid phone number.");
            	errors = true;
            }
            else if($(this).hasClass('sub_firstAndLastName')){
            	if($("#"+id+"_first").val()==""||$("#"+id+"_last").val()==""){
            		 $("#error_"+id).fadeIn().html("Please enter the first and last name.");
            		 errors = true;
            	}

            }
            else{
                $("#error_"+id).fadeIn().html("");
              }
          }
          else{
          	if(type == "email" || $(this).hasClass('sub_email')){
              if(!isValidEmailAddress(val)){
                $("#error_"+id).fadeIn().html("This is not a valid email.");
                errors = true;
              }
              else{
                $("#error_"+id).fadeIn().html("");
              }
            }
          }

        });

        if(validateCb()) errors = true;
        if(validateRb()) errors = true;

        if(validateCaptcha()) errors = true;

        return errors;

              //Validate Checkboxes
function validateCb(){
  var checkbox_groups = {};
  var cbError;
    $('#form_'+appId+' *').filter(":checkbox").each(function(){
    checkbox_groups[this.name] = true;

   for(group in checkbox_groups){
    if($(":checkbox[name='"+group+"']").hasClass('sub_required')){
      if_checked = !!$(":checkbox[name='"+group+"']:checked").length;
      var dotPosition = group.indexOf(".");
      var bitBeforeDot = group.substring(0,dotPosition);
      if(if_checked){
        cbError = false;
        $("#error_"+bitBeforeDot).fadeIn().html("");
      }
      else{
        cbError = true;
        $("#error_"+bitBeforeDot).fadeIn().html("Please check at least one.");
      }
    }
   }


  });
  return cbError;
}

//validate radio buttons
function validateRb(){
  var radio_groups = {};
  var rbError;
    $('#form_'+appId+' *').filter(":radio").each(function(){
    radio_groups[this.name] = true;

   for(group in radio_groups){
    if($(":radio[name='"+group+"']").hasClass('sub_required')){
      if_checked = !!$(":radio[name='"+group+"']:checked").length;

      if(if_checked){
        rbError = false;
        $("#error_"+group).fadeIn().html("");
      }
      else{
        rbError = true;
        $("#error_"+group).fadeIn().html("Please select a value.");
      }
    }
   }


  });
    return rbError;
}


        function validateCaptcha(){
        	var subPlatCaptchaResponse = $('#captcha_resp_'+appId).val();
        	var hasCaptcha = $('#hasCaptcha_'+appId).val();
        	if(hasCaptcha == "true" && !subPlatCaptchaResponse){
        		$("#captcha_error_"+appId).fadeIn().html("Please check the box below to verify that you are not a robot.");
        		return true;
        	}
        	else {
        		$("#captcha_error_"+appId).fadeIn().html("");
        		return false;
        	}
        }

function isValidEmailAddress(emailAddress) {
        var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
        return pattern.test(emailAddress);
      };


/*************END: FORM VALIDATION ******************/


  },
	getPupBase:function(env){
		var pupBase;
		if(env == 'local'){
			pupBase = "//localhost:3000/";
		}
		else{
			pupBase = "//localhost:3000/";
		}
		return pupBase;
	},

	createUpId:function(){
		var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
		    function(c) {
		      var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
		      return v.toString(16);});
		  return id;
	},
	isIE:function(){
		var myNav = navigator.userAgent.toLowerCase();
  		return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
	},
	usStates:[{"name":"District Of Columbia","abbreviation":"DC"},{"name":"Maryland","abbreviation":"MD"},{"name":"Virginia","abbreviation":"VA"},{"name":"Alabama","abbreviation":"AL"},{"name":"Alaska","abbreviation":"AK"},{"name":"American Samoa","abbreviation":"AS"},{"name":"Arizona","abbreviation":"AZ"},{"name":"Arkansas","abbreviation":"AR"},{"name":"California","abbreviation":"CA"},{"name":"Colorado","abbreviation":"CO"},{"name":"Connecticut","abbreviation":"CT"},{"name":"Delaware","abbreviation":"DE"},{"name":"Federated States Of Micronesia","abbreviation":"FM"},{"name":"Florida","abbreviation":"FL"},{"name":"Georgia","abbreviation":"GA"},{"name":"Guam","abbreviation":"GU"},{"name":"Hawaii","abbreviation":"HI"},{"name":"Idaho","abbreviation":"ID"},{"name":"Illinois","abbreviation":"IL"},{"name":"Indiana","abbreviation":"IN"},{"name":"Iowa","abbreviation":"IA"},{"name":"Kansas","abbreviation":"KS"},{"name":"Kentucky","abbreviation":"KY"},{"name":"Louisiana","abbreviation":"LA"},{"name":"Maine","abbreviation":"ME"},{"name":"Marshall Islands","abbreviation":"MH"},{"name":"Massachusetts","abbreviation":"MA"},{"name":"Michigan","abbreviation":"MI"},{"name":"Minnesota","abbreviation":"MN"},{"name":"Mississippi","abbreviation":"MS"},{"name":"Missouri","abbreviation":"MO"},{"name":"Montana","abbreviation":"MT"},{"name":"Nebraska","abbreviation":"NE"},{"name":"Nevada","abbreviation":"NV"},{"name":"New Hampshire","abbreviation":"NH"},{"name":"New Jersey","abbreviation":"NJ"},{"name":"New Mexico","abbreviation":"NM"},{"name":"New York","abbreviation":"NY"},{"name":"North Carolina","abbreviation":"NC"},{"name":"North Dakota","abbreviation":"ND"},{"name":"Northern Mariana Islands","abbreviation":"MP"},{"name":"Ohio","abbreviation":"OH"},{"name":"Oklahoma","abbreviation":"OK"},{"name":"Oregon","abbreviation":"OR"},{"name":"Palau","abbreviation":"PW"},{"name":"Pennsylvania","abbreviation":"PA"},{"name":"Puerto Rico","abbreviation":"PR"},{"name":"Rhode Island","abbreviation":"RI"},{"name":"South Carolina","abbreviation":"SC"},{"name":"South Dakota","abbreviation":"SD"},{"name":"Tennessee","abbreviation":"TN"},{"name":"Texas","abbreviation":"TX"},{"name":"Utah","abbreviation":"UT"},{"name":"Vermont","abbreviation":"VT"},{"name":"Virgin Islands","abbreviation":"VI"},{"name":"Washington","abbreviation":"WA"},{"name":"West Virginia","abbreviation":"WV"},{"name":"Wisconsin","abbreviation":"WI"},{"name":"Wyoming","abbreviation":"WY"}],
	countries:[{"name":"United States","code":"US"},{"name":"Afghanistan","code":"AF"},{"name":"Åland Islands","code":"AX"},{"name":"Albania","code":"AL"},{"name":"Algeria","code":"DZ"},{"name":"American Samoa","code":"AS"},{"name":"AndorrA","code":"AD"},{"name":"Angola","code":"AO"},{"name":"Anguilla","code":"AI"},{"name":"Antarctica","code":"AQ"},{"name":"Antigua and Barbuda","code":"AG"},{"name":"Argentina","code":"AR"},{"name":"Armenia","code":"AM"},{"name":"Aruba","code":"AW"},{"name":"Australia","code":"AU"},{"name":"Austria","code":"AT"},{"name":"Azerbaijan","code":"AZ"},{"name":"Bahamas","code":"BS"},{"name":"Bahrain","code":"BH"},{"name":"Bangladesh","code":"BD"},{"name":"Barbados","code":"BB"},{"name":"Belarus","code":"BY"},{"name":"Belgium","code":"BE"},{"name":"Belize","code":"BZ"},{"name":"Benin","code":"BJ"},{"name":"Bermuda","code":"BM"},{"name":"Bhutan","code":"BT"},{"name":"Bolivia","code":"BO"},{"name":"Bosnia and Herzegovina","code":"BA"},{"name":"Botswana","code":"BW"},{"name":"Bouvet Island","code":"BV"},{"name":"Brazil","code":"BR"},{"name":"British Indian Ocean Territory","code":"IO"},{"name":"Brunei Darussalam","code":"BN"},{"name":"Bulgaria","code":"BG"},{"name":"Burkina Faso","code":"BF"},{"name":"Burundi","code":"BI"},{"name":"Cambodia","code":"KH"},{"name":"Cameroon","code":"CM"},{"name":"Canada","code":"CA"},{"name":"Cape Verde","code":"CV"},{"name":"Cayman Islands","code":"KY"},{"name":"Central African Republic","code":"CF"},{"name":"Chad","code":"TD"},{"name":"Chile","code":"CL"},{"name":"China","code":"CN"},{"name":"Christmas Island","code":"CX"},{"name":"Cocos (Keeling) Islands","code":"CC"},{"name":"Colombia","code":"CO"},{"name":"Comoros","code":"KM"},{"name":"Congo","code":"CG"},{"name":"Congo, Democratic Republic","code":"CD"},{"name":"Cook Islands","code":"CK"},{"name":"Costa Rica","code":"CR"},{"name":"Cote D\"Ivoire","code":"CI"},{"name":"Croatia","code":"HR"},{"name":"Cuba","code":"CU"},{"name":"Cyprus","code":"CY"},{"name":"Czech Republic","code":"CZ"},{"name":"Denmark","code":"DK"},{"name":"Djibouti","code":"DJ"},{"name":"Dominica","code":"DM"},{"name":"Dominican Republic","code":"DO"},{"name":"Ecuador","code":"EC"},{"name":"Egypt","code":"EG"},{"name":"El Salvador","code":"SV"},{"name":"Equatorial Guinea","code":"GQ"},{"name":"Eritrea","code":"ER"},{"name":"Estonia","code":"EE"},{"name":"Ethiopia","code":"ET"},{"name":"Falkland Islands (Malvinas)","code":"FK"},{"name":"Faroe Islands","code":"FO"},{"name":"Fiji","code":"FJ"},{"name":"Finland","code":"FI"},{"name":"France","code":"FR"},{"name":"French Guiana","code":"GF"},{"name":"French Polynesia","code":"PF"},{"name":"French Southern Territories","code":"TF"},{"name":"Gabon","code":"GA"},{"name":"Gambia","code":"GM"},{"name":"Georgia","code":"GE"},{"name":"Germany","code":"DE"},{"name":"Ghana","code":"GH"},{"name":"Gibraltar","code":"GI"},{"name":"Greece","code":"GR"},{"name":"Greenland","code":"GL"},{"name":"Grenada","code":"GD"},{"name":"Guadeloupe","code":"GP"},{"name":"Guam","code":"GU"},{"name":"Guatemala","code":"GT"},{"name":"Guernsey","code":"GG"},{"name":"Guinea","code":"GN"},{"name":"Guinea-Bissau","code":"GW"},{"name":"Guyana","code":"GY"},{"name":"Haiti","code":"HT"},{"name":"Heard Island and Mcdonald Islands","code":"HM"},{"name":"Holy See (Vatican City State)","code":"VA"},{"name":"Honduras","code":"HN"},{"name":"Hong Kong","code":"HK"},{"name":"Hungary","code":"HU"},{"name":"Iceland","code":"IS"},{"name":"India","code":"IN"},{"name":"Indonesia","code":"ID"},{"name":"Iran","code":"IR"},{"name":"Iraq","code":"IQ"},{"name":"Ireland","code":"IE"},{"name":"Isle of Man","code":"IM"},{"name":"Israel","code":"IL"},{"name":"Italy","code":"IT"},{"name":"Jamaica","code":"JM"},{"name":"Japan","code":"JP"},{"name":"Jersey","code":"JE"},{"name":"Jordan","code":"JO"},{"name":"Kazakhstan","code":"KZ"},{"name":"Kenya","code":"KE"},{"name":"Kiribati","code":"KI"},{"name":"Korea (North)","code":"KP"},{"name":"Korea (South)","code":"KR"},{"name":"Kosovo","code":"XK"},{"name":"Kuwait","code":"KW"},{"name":"Kyrgyzstan","code":"KG"},{"name":"Laos","code":"LA"},{"name":"Latvia","code":"LV"},{"name":"Lebanon","code":"LB"},{"name":"Lesotho","code":"LS"},{"name":"Liberia","code":"LR"},{"name":"Libyan Arab Jamahiriya","code":"LY"},{"name":"Liechtenstein","code":"LI"},{"name":"Lithuania","code":"LT"},{"name":"Luxembourg","code":"LU"},{"name":"Macao","code":"MO"},{"name":"Macedonia","code":"MK"},{"name":"Madagascar","code":"MG"},{"name":"Malawi","code":"MW"},{"name":"Malaysia","code":"MY"},{"name":"Maldives","code":"MV"},{"name":"Mali","code":"ML"},{"name":"Malta","code":"MT"},{"name":"Marshall Islands","code":"MH"},{"name":"Martinique","code":"MQ"},{"name":"Mauritania","code":"MR"},{"name":"Mauritius","code":"MU"},{"name":"Mayotte","code":"YT"},{"name":"Mexico","code":"MX"},{"name":"Micronesia","code":"FM"},{"name":"Moldova","code":"MD"},{"name":"Monaco","code":"MC"},{"name":"Mongolia","code":"MN"},{"name":"Montserrat","code":"MS"},{"name":"Morocco","code":"MA"},{"name":"Mozambique","code":"MZ"},{"name":"Myanmar","code":"MM"},{"name":"Namibia","code":"NA"},{"name":"Nauru","code":"NR"},{"name":"Nepal","code":"NP"},{"name":"Netherlands","code":"NL"},{"name":"Netherlands Antilles","code":"AN"},{"name":"New Caledonia","code":"NC"},{"name":"New Zealand","code":"NZ"},{"name":"Nicaragua","code":"NI"},{"name":"Niger","code":"NE"},{"name":"Nigeria","code":"NG"},{"name":"Niue","code":"NU"},{"name":"Norfolk Island","code":"NF"},{"name":"Northern Mariana Islands","code":"MP"},{"name":"Norway","code":"NO"},{"name":"Oman","code":"OM"},{"name":"Pakistan","code":"PK"},{"name":"Palau","code":"PW"},{"name":"Palestinian Territory, Occupied","code":"PS"},{"name":"Panama","code":"PA"},{"name":"Papua New Guinea","code":"PG"},{"name":"Paraguay","code":"PY"},{"name":"Peru","code":"PE"},{"name":"Philippines","code":"PH"},{"name":"Pitcairn","code":"PN"},{"name":"Poland","code":"PL"},{"name":"Portugal","code":"PT"},{"name":"Puerto Rico","code":"PR"},{"name":"Qatar","code":"QA"},{"name":"Reunion","code":"RE"},{"name":"Romania","code":"RO"},{"name":"Russian Federation","code":"RU"},{"name":"RWANDA","code":"RW"},{"name":"Saint Helena","code":"SH"},{"name":"Saint Kitts and Nevis","code":"KN"},{"name":"Saint Lucia","code":"LC"},{"name":"Saint Pierre and Miquelon","code":"PM"},{"name":"Saint Vincent and the Grenadines","code":"VC"},{"name":"Samoa","code":"WS"},{"name":"San Marino","code":"SM"},{"name":"Sao Tome and Principe","code":"ST"},{"name":"Saudi Arabia","code":"SA"},{"name":"Senegal","code":"SN"},{"name":"Serbia","code":"RS"},{"name":"Montenegro","code":"ME"},{"name":"Seychelles","code":"SC"},{"name":"Sierra Leone","code":"SL"},{"name":"Singapore","code":"SG"},{"name":"Slovakia","code":"SK"},{"name":"Slovenia","code":"SI"},{"name":"Solomon Islands","code":"SB"},{"name":"Somalia","code":"SO"},{"name":"South Africa","code":"ZA"},{"name":"South Georgia and the South Sandwich Islands","code":"GS"},{"name":"Spain","code":"ES"},{"name":"Sri Lanka","code":"LK"},{"name":"Sudan","code":"SD"},{"name":"Suriname","code":"SR"},{"name":"Svalbard and Jan Mayen","code":"SJ"},{"name":"Swaziland","code":"SZ"},{"name":"Sweden","code":"SE"},{"name":"Switzerland","code":"CH"},{"name":"Syrian Arab Republic","code":"SY"},{"name":"Taiwan, Province of China","code":"TW"},{"name":"Tajikistan","code":"TJ"},{"name":"Tanzania","code":"TZ"},{"name":"Thailand","code":"TH"},{"name":"Timor-Leste","code":"TL"},{"name":"Togo","code":"TG"},{"name":"Tokelau","code":"TK"},{"name":"Tonga","code":"TO"},{"name":"Trinidad and Tobago","code":"TT"},{"name":"Tunisia","code":"TN"},{"name":"Turkey","code":"TR"},{"name":"Turkmenistan","code":"TM"},{"name":"Turks and Caicos Islands","code":"TC"},{"name":"Tuvalu","code":"TV"},{"name":"Uganda","code":"UG"},{"name":"Ukraine","code":"UA"},{"name":"United Arab Emirates","code":"AE"},{"name":"United Kingdom","code":"GB"},{"name":"United States Minor Outlying Islands","code":"UM"},{"name":"Uruguay","code":"UY"},{"name":"Uzbekistan","code":"UZ"},{"name":"Vanuatu","code":"VU"},{"name":"Venezuela","code":"VE"},{"name":"Viet Nam","code":"VN"},{"name":"Virgin Islands, British","code":"VG"},{"name":"Virgin Islands, U.S.","code":"VI"},{"name":"Wallis and Futuna","code":"WF"},{"name":"Western Sahara","code":"EH"},{"name":"Yemen","code":"YE"},{"name":"Zambia","code":"ZM"},{"name":"Zimbabwe","code":"ZW"}]

}
